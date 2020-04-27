import debug from 'debug'
import { EventEmitter, on, once } from 'events'
import graphql from 'graphql'
import { PassThrough, pipeline, Readable } from 'stream'
import { inspect, promisify } from 'util'
import WebSocket from 'ws'

const log = debug('gql-ws').extend('client')
const { parse, print, stripIgnoredCharacters } = graphql
const async_pipeline = promisify(pipeline)

export default class Client {
  #ws
  #streams
  #timeout
  #options
  #protocols

  #emitter = new EventEmitter()
  #operation_id = -1

  /**
 * Create a graphql websocket client
 * @param {Object} payload
 * @param {String|Array} payload.protocols The list of subprotocols.
 * @param {Object} payload.ws_options see https://github.com/websockets/ws/blob/master/doc/ws.md#new-websocketaddress-protocols-options
 * @param {Number} payload.timeout the server timeout + a latency prevision, ex: 30000 + 1000
 */
  constructor({ protocols, ws_options, timeout = 31_000 }) {
    log('initializing client..')
    this.#streams = new Map()
    this.#timeout = timeout
    this.#protocols = protocols
    this.#options = ws_options
  }

  async pipe_streams() {
    await async_pipeline(
      on(this.#ws, 'message'),
      async source => {
        try {
          for await (const chunk of source) {
            const operation_response = JSON.parse(chunk.toString())
            log('incomming operation %O', operation_response)
            const { id, operation_type, ...rest } = operation_response
            const through = this.#streams.get(id)
            if (!through.write(rest)) await promisify(through.once.bind(through))('drain')
            // if (operation_type === 'subscription') {
            //   const through = this.#streams.get(id)
            //   if (!through.write(rest)) await promisify(through.once.bind(through))('drain')
            // } else this.#emitter.emit(`${id}`, rest)
          }
        } catch (error) {
          console.error(error)
        }
      },
    )
    log('disconnected')
  }

  heartbeat() {
    clearTimeout(this.#ws.timeout)
    this.#ws.timeout = setTimeout(() => { this.#ws.terminate() }, this.#timeout)
  }

  /**
 * Connect the client to an address, a client must be disconnected before connecting again or it will throw an error
 * @param {String} address The connection uri.
 */
  async connect(address) {
    this.#ws = new WebSocket(address, this.#protocols, this.#options)
    this.pipe_streams()
    await promisify(this.#ws.once.bind(this.#ws))('open')
    this.heartbeat()
    this.#ws.on('ping', this.heartbeat.bind(this))
    this.#ws.on('close', () => clearTimeout(this.#ws.timeout))
    log('client ready')
  }

  disconnect() {
    clearTimeout(this.#ws.timeout)
    this.#ws.terminate()
    log('disconnected')
  }

  async query(query, variables = {}) {
    log('querying')
    this.#operation_id++
    // supporting plain string and graphql-tag
    const { definitions } = query?.kind === 'Document' ? query : parse(query, { noLocation: true })
    // failing when some operations have no names, but allowing unnamed single operations
    // const include_subscription = definitions.some(({ operation }) => operation === 'subscription')
    // log('include subscription [%O]', include_subscription)

    // const pass_through = include_subscription ? new PassThrough({ objectMode: true }) : Readable.from([])
    const pass_through = new PassThrough({ objectMode: true })
    // if (include_subscription) this.#streams.set(this.#operation_id, pass_through)
    this.#streams.set(this.#operation_id, pass_through)

    const query_blocs = definitions.map(operation_definition => stripIgnoredCharacters(print(operation_definition)))
    log('operation', inspect({ id: this.#operation_id, operations: query_blocs, variables }, false, null, true))
    // const result = once(this.#emitter, `${this.#operation_id}`)

    const serialized_query = JSON.stringify({ id: this.#operation_id, operations: query_blocs, variables })
    this.#ws.send(serialized_query)
    return {
      // json: async () => (await result)[0],
      async *[Symbol.asyncIterator]() {
        yield* pass_through
      },
    }
  }
}
