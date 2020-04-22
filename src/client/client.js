import debug from 'debug'
import { EventEmitter, once } from 'events'
import graphql from 'graphql'
import { PassThrough, pipeline, Readable } from 'stream'
import { inspect, promisify } from 'util'
import WebSocket from 'ws'

const log = debug('gql-ws')
const { parse, print, stripIgnoredCharacters } = graphql

export default class Client {
  #ws
  #ws_stream
  #ws_once
  #streams
  #timeout

  #emitter = new EventEmitter()
  #operation_id = -1

  /**
 * Create a graphql websocket client
 * @param {Object} payload
 * @param {String|url.URL} payload.address The URL to which to connect.
 * @param {String|Array} payload.protocols The list of subprotocols.
 * @param {Object} payload.options see https://github.com/websockets/ws/blob/master/doc/ws.md#new-websocketaddress-protocols-options
 * @param {Number} payload.timeout the server timeout + a latency prevision, ex: 30000 + 1000
 */
  constructor({ address, protocols, options, timeout = 31_000 }) {
    log('initializing client..')
    this.#ws = new WebSocket(address, protocols, options)
    this.#ws_stream = WebSocket.createWebSocketStream(this.#ws)
    this.#ws_once = promisify(this.#ws_stream.once.bind(this.#ws_stream))
    this.#streams = new Map()
    this.#timeout = timeout

    this.pipe_streams()
  }

  pipe_streams() {
    pipeline(
      this.#ws_stream,
      async source => {
        log('incomming source')
        for await (const chunk of source) {
          const operation_response = JSON.parse(chunk.toString())
          log('incomming chunk %O', operation_response)
          const { id, operation_type, ...rest } = operation_response
          if (operation_type === 'subscription') {
            const through = this.#streams.get(id)
            if (!through.write(rest)) await promisify(through.once.bind(through))('drain')
          } else this.#emitter.emit(`${id}`, rest)
        }
      },
      error => { if (error) console.error(error) },
    )
  }

  heartbeat() {
    clearTimeout(this.#ws.timeout)
    this.#ws.timeout = setTimeout(() => { this.#ws.terminate() }, this.#timeout)
  }

  async connect() {
    await promisify(this.#ws.once.bind(this.#ws))('open')
    this.heartbeat()
    this.#ws.on('ping', this.heartbeat.bind(this))
    this.#ws.on('close', () => clearTimeout(this.#ws.timeout))
    log('client ready')
  }

  async query(query, variables = {}) {
    log('querying')
    this.#operation_id++
    // supporting plain string and graphql-tag
    const { definitions } = query?.kind === 'Document' ? query : parse(query)
    // failing when some operations have no names, but allowing unnamed single operations
    const include_subscription = definitions.some(({ operation }) => operation === 'subscription')
    log('include subscription [%O]', include_subscription)

    const pass_through = include_subscription ? new PassThrough({ objectMode: true }) : Readable.from([])
    if (include_subscription) this.#streams.set(this.#operation_id, pass_through)

    const query_blocs = definitions.map(operation_definition => stripIgnoredCharacters(print(operation_definition)))
    log('operation', inspect({ id: this.#operation_id, operations: query_blocs, variables }, false, null, true))
    const result = once(this.#emitter, `${this.#operation_id}`)
    if (!this.#ws_stream.write(JSON.stringify({ id: this.#operation_id, operations: query_blocs, variables }))) await this.#ws_once('drain')
    return {
      json: async () => (await result)[0],
      async *[Symbol.asyncIterator]() {
        for await (const chunk of pass_through) yield chunk
      },
    }
  }
}
