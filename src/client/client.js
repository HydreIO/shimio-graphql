import debug from 'debug'
import { EventEmitter, once } from 'events'
import graphql from 'graphql'
import { PassThrough, pipeline, Readable } from 'stream'
import { inspect, promisify } from 'util'
import WebSocket from 'ws'

const log = debug('gql-ws')
const { parse, print, stripIgnoredCharacters } = graphql

/**
 * Create a graphql websocket client
 * @param {Object} payload
 * @param {String|url.URL} payload.address The URL to which to connect.
 * @param {String|Array} payload.protocols The list of subprotocols.
 * @param {Object} payload.options see https://github.com/websockets/ws/blob/master/doc/ws.md#new-websocketaddress-protocols-options
 */
export default async ({ address, protocols, options }) => {
  log('initializing client..')
  const emitter = new EventEmitter()
  const ws = new WebSocket(address, protocols, options)
  const ws_stream = WebSocket.createWebSocketStream(ws)
  const ws_once = promisify(ws_stream.once.bind(ws_stream))
  const streams = new Map()

  log('piping streams..')
  pipeline(
    ws_stream,
    async source => {
      log('incomming source')
      for await (const chunk of source) {
        const operation_response = JSON.parse(chunk.toString())
        log('incomming chunk %O', operation_response)
        const { id, operation_type, ...rest } = operation_response
        try {
          if (operation_type === 'subscription') {
            const through = streams.get(id)
            if (!through.write(rest)) await promisify(through.once.bind(through))('drain')
          } else emitter.emit(`${id}`, rest)
        } catch (error) {
          console.error(error)
        }
      }
    },
    error => { if (error) console.error(error) },
  )

  await promisify(ws.once.bind(ws))('open')
  log('client ready')
  let id = -1

  return async (query, variables = {}) => {
    log('querying')
    id++
    // supporting plain string and graphql-tag
    const { definitions } = query?.kind === 'Document' ? query : parse(query)
    // failing when some operations have no names, but allowing unnamed single operations
    const include_subscription = definitions.some(({ operation }) => operation === 'subscription')
    log('include subscription [%O]', include_subscription)

    const pass_through = include_subscription ? new PassThrough({ objectMode: true }) : Readable.from([])
    if (include_subscription) streams.set(id, pass_through)

    const query_blocs = definitions.map(operation_definition => stripIgnoredCharacters(print(operation_definition)))
    log('operation', inspect({ id, operations: query_blocs, variables }, false, null, true))
    const result = once(emitter, `${id}`)
    if (!ws_stream.write(JSON.stringify({ id, operations: query_blocs, variables }))) { await ws_once('drain') }
    return {
      json: async () => (await result)[0],
      async *[Symbol.asyncIterator]() {
        for await (const chunk of pass_through) yield chunk
      },
    }
  }
}
