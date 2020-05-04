import debug from 'debug'
import graphql from 'graphql'
import WebSocket from 'ws'
import invariant from 'invariant'
import {
  pipeline, PassThrough,
} from 'stream'
import {
  promisify,
} from 'util'
import {
  on,
} from 'events'

const log = debug('gql-ws').extend('client')
const {
  stripIgnoredCharacters, parse,
} = graphql
const DEFAULT_TIMEOUT = 31_000

export default class Client {
  ws
  streams
  timeout
  options
  protocols
  operation_id = 0

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
    this.streams = new Map()
    this.timeout = timeout
    this.protocols = protocols
    this.options = ws_options
  }

  pipe_streams() {
    pipeline(
        on(this.ws, 'message'),
        async source => {
          try {
            for await (const chunk of source) {
              const operation_response = JSON.parse(chunk.toString())
              log('incomming operation %O', operation_response)
              const {
                id,
              } = operation_response
              const through = this.streams.get(id)
              if (!through.write(operation_response))
                await promisify(through.once.bind(through))('drain')
            }
          } catch (error) {
            console.error(error)
          }
        },
        error => {
          if (error) console.error(error)
          log('disconnected')
        },
    )
  }

  heartbeat() {
    clearTimeout(this.ws.timeout)
    this.ws.timeout = setTimeout(() => {
      this.ws.terminate()
    }, this.timeout)
  }

  /**
   * Connect the client to an address,
   * a client must be disconnected before connecting again
   * or it will throw an error
   * @param {String} address The connection uri.
   */
  async connect(address) {
    this.ws = new WebSocket(
        address, this.protocols, this.options,
    )
    this.pipe_streams()
    await promisify(this.ws.once.bind(this.ws))('open')
    this.heartbeat()
    this.ws.on('ping', this.heartbeat.bind(this))
    this.ws.on('close', () => clearTimeout(this.ws.timeout))
    log('client ready')
  }

  disconnect() {
    clearTimeout(this.ws.timeout)
    this.ws.terminate()
    log('disconnected')
  }

  async query(query, variables = {}) {
    invariant(typeof query === 'string', 'The query is not a String')

    // fail fast
    parse(query)

    log('querying')
    const operation_id = this.operation_id++
    const pass_through = new PassThrough({
      objectMode: true,
    })
    const serialized_query = JSON.stringify({
      id      : operation_id,
      document: stripIgnoredCharacters(query),
      variables,
    })

    this.streams.set(operation_id, pass_through)
    this.ws.send(serialized_query)
    const {
      ws,
    } = this
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
