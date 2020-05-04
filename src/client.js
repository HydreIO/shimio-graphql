import debug from 'debug'
import {
  on,
} from 'events'
import graphql from 'graphql'
import which_stream from './stream.js'
import {
  promisify,
} from 'util'
import WebSocket from 'ws'
import invariant from 'invariant'

const log = debug('gql-ws').extend('client')
const {
  stripIgnoredCharacters, parse,
} = graphql
const DEFAULT_TIMEOUT = 31_000
const util_promisify =
  fn =>
    (...parameters) =>
      new Promise(callback => {
        Reflect.apply(
            fn, fn, [...parameters, callback],
        )
      })

// Hate doing that but as i don't want to write 2 clients file
// for either node and the browser i kinda hack my way into it
// by using a runtime resolved instance of stream
// which will be node streams in node
// and the readable-stream package in the browser
// eslint-disable-next-line no-unused-vars
// eslint-disable-next-line init-declarations
let stream

export default class Client {
  #ws
  #streams
  #timeout
  #options
  #protocols
  #operation_id = 0

  /**
   * Create a graphql websocket client
   * @param {Object} payload
   * @param {String|Array} payload.protocols The list of subprotocols.
   * @param {Object} payload.ws_options see https://github.com/websockets/ws/blob/master/doc/ws.md#new-websocketaddress-protocols-options
   * @param {Number} payload.timeout the server timeout
   * + a latency prevision, ex: 30000 + 1000
   */
  constructor({
    protocols, ws_options, timeout = DEFAULT_TIMEOUT,
  }) {
    log('initializing client..')
    this.#streams = new Map()
    this.#timeout = timeout
    this.#protocols = protocols
    this.#options = ws_options
  }

  async pipe_streams() {
    // let's get our streams gentlemens
    stream = await which_stream()
    // === end hack /shrug
    const async_pipeline = util_promisify(stream.pipeline)

    await async_pipeline(on(this.#ws, 'message'), async source => {
      try {
        for await (const chunk of source) {
          const operation_response = JSON.parse(chunk.toString())
          log('incomming operation %O', operation_response)
          const {
            id,
          } = operation_response
          const through = this.#streams.get(id)
          if (!through.write(operation_response))
            await promisify(through.once.bind(through))('drain')
        }
      } catch (error) {
        console.error(error)
      }
    })
    log('disconnected')
  }

  heartbeat() {
    clearTimeout(this.#ws.timeout)
    this.#ws.timeout = setTimeout(() => {
      this.#ws.terminate()
    }, this.#timeout)
  }

  /**
   * Connect the client to an address,
   * a client must be disconnected before connecting again
   * or it will throw an error
   * @param {String} address The connection uri.
   */
  async connect(address) {
    this.#ws = new WebSocket(
        address, this.#protocols, this.#options,
    )
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
    invariant(typeof query === 'string', 'The query is not a String')

    // fail fast
    parse(query)

    log('querying')
    const operation_id = this.#operation_id++
    const pass_through = new stream.PassThrough({
      objectMode: true,
    })
    const serialized_query = JSON.stringify({
      id      : operation_id,
      document: stripIgnoredCharacters(query),
      variables,
    })

    this.#streams.set(operation_id, pass_through)
    this.#ws.send(serialized_query)
    const ws = this.#ws
    return {
      async json() {
        for await (const result of pass_through) return result
        return undefined
      },
      terminate() {
        ws.send(JSON.stringify({
          id   : operation_id,
          unsub: 1,
        }))
        pass_through.end()
      },
      async *[Symbol.asyncIterator]() {
        yield* pass_through
      },
    }
  }
}
