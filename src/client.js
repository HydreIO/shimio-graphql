import { EventEmitter } from 'events'
import graphql from 'graphql'
import { PassThrough, pipeline } from 'stream'
import { promisify } from 'util'
import WebSocket from 'ws'

const { separateOperations, parse, print, stripIgnoredCharacters, getOperationAST } = graphql

/**
 * Create a graphql websocket client
 * @param {String|url.URL} address The URL to which to connect.
 * @param {String|Array} protocols The list of subprotocols.
 * @param {Object} options see https://github.com/websockets/ws/blob/master/doc/ws.md#new-websocketaddress-protocols-options
 */
export default async (address, protocols, options) => {
  const emitter = new EventEmitter()
  const ws = new WebSocket(address, protocols, options)
  const ws_stream = WebSocket.createWebSocketStream(ws)
  const ws_once = promisify(ws_stream.once)
  const emitter_once = promisify(emitter.once)
  const streams = new Map()

  pipeline(
    ws_stream,
    async source => {
      for await (const chunk of source) {
        const { op_id, operation_type, ...rest } = JSON.parse(chunk.toString())
        if (operation_type === 'subscription') {
          const through = streams.get(op_id)
          if (!through.write(rest)) await promisify(through.once)('drain')
        } else emitter.emit(`${op_id}`)
      }
    },
  )

  await promisify(ws.once)('open')
  let op_id = -1

  return async (query, variables = {}) => {
    // supporting plain string and graphql-tag
    const documents = separateOperations(typeof query === 'object' ? query : parse(query))
    const include_subscription = documents.find(document => getOperationAST(document)?.operation === 'subscription')
    if (include_subscription) streams.set(op_id, new PassThrough())
    const operations = documents.map(document => ({ op_id: ++op_id, query: stripIgnoredCharacters(print(document)) }))
    const result = emitter_once(`${op_id}`)
    if (!ws_stream.write(JSON.stringify({ operations, variables }))) { await ws_once('drain') }
    return {
      json: async () => result,
      *[Symbol.asyncIterator]() {
        return streams.get(op_id)
      },
    }
  }
}
