import debug from 'debug'
import WebSocket from 'ws'
import http from 'http'
import compose from 'koa-compose'
import Executor from '@hydre/graphql-batch-executor'

import {
  on,
} from 'events'

import {
  pipeline,
} from 'stream'

const log = debug('gql-ws').extend('server')
const DEFAULT_TIMEOUT = 30_000

export default class {
  #ws_options
  #schema
  #rootValue
  #context
  #web_server

  #middleware = []
  #timeout

  /**
   * Initialize a graphql websocket server with a configuration object
   * @param {Object} options - server options
   * @param {Number} [options.timeout=30000] - in millisecond,
   *  try to deconnect non reachable clients
   * @param {Object} [options.ws_options] - see https://github.com/websockets/ws/blob/master/doc/ws.md#new-websocketserveroptions-callback
   * @param {graphql.SchemaDefinitionNode} options.schema - a graphql schema
   * @param {Object} options.rootValue - a graphql resolver object
   * @param {(Object|Function)} [options.context={}] - the context object
   * or as a function/async function to dynamically
   * build it on every upgrade request
   */
  constructor({
    ws_options = {
      path             : '/',
      perMessageDeflate: false,
      maxPayload       : 500,
    },
    schema = (() => {
      throw new Error('Missing or invalid schema')
    })(),
    rootValue = {},
    context = {},
    web_server = http.createServer(),
    timeout = DEFAULT_TIMEOUT,
  }) {
    this.#ws_options = ws_options
    this.#schema = schema
    this.#rootValue = rootValue
    this.#web_server = web_server
    this.#context = context
    this.#timeout = timeout
  }

  /**
   * Resolve the context to allow usage of dynamic context building
   * @param {(Object | Function | AsyncFunction)} context
   */
  context(...parameters) {
    if (typeof this.#context === 'object') return this.#context
    return this.#context(...parameters)
  }

  use(middleware) {
    this.#middleware.push(middleware)
  }

  listen(...parameters) {
    const middleware = compose(this.#middleware)
    const http_server = this.#web_server.listen(...parameters)
    // we prevent usage of those as it's up to the http server to decide
    // @see https://github.com/websockets/ws/blob/master/doc/ws.md#new-websocketserveroptions-callback
    const {
      host, port, ...options
    } = this.#ws_options
    const wss = new WebSocket.Server({
      ...options,
      noServer: true,
    })

    wss.on('connection', (
        ws, {
          headers,
        }, contextValue,
    ) => {
      const client_id = headers['sec-websocket-key']
      const log_peer = log.extend(client_id)

      log_peer('connected!')

      const executor = new Executor({
        id             : client_id,
        schema         : this.#schema,
        rootValue      : this.#rootValue,
        contextValue,
        high_water_mark: 40,
      })
      const user_streams = new Map()

      ws.alive = true
      ws.force_terminate = () => {
        for (const stream of user_streams.values()) stream.end()
        ws.terminate()
        log_peer('client disconnected')
      }

      ws.on('pong', () => {
        ws.alive = true
      })
      ws.on('error', error => {
        log_peer(error)
        ws.force_terminate()
      })
      ws.on('close', () => {
        ws.force_terminate()
      })

      pipeline(
          on(ws, 'message'),
          async function *(source) {
            for await (const chunk of source) {
              const {
                id: operation_id, document, variables,
              } = JSON.parse(chunk.toString())

              // in case we already know this operation we end it
              // this could be an unsubscribe request from the client
              // or a simple mistake.
              // in any case we don't want duplicated operations
              if (user_streams.has(operation_id)) {
                const stream = user_streams.get(operation_id)
                log_peer('operation %O was terminated', operation_id)
                stream.end()

                continue
              }

              yield {
                id: operation_id,
                document,
                variables,
              }
            }
          },
          executor.generate.bind(executor),
          async source => {
            for await (const {
              id: stream_id, stream,
            } of source) {
              user_streams.set(stream_id, stream)

              pipeline(
                  stream,
                  async stream_source => {
                    for await (const chunk of stream_source) {
                      if (!ws.alive) {
                        ws.force_terminate()
                        return
                      }

                      const {
                        operation_type, operation_name, data, errors,
                      } = chunk
                      log_peer(
                          'sending <%O|%O> : %O',
                          operation_type,
                          operation_name,
                    errors?.length ? errors : data,
                      )
                      ws.send(JSON.stringify({
                        id: stream_id,
                        operation_type,
                        operation_name,
                        data,
                        errors,
                      }))
                    }
                  },
                  error => {
                    ws.send(JSON.stringify({
                      id : stream_id,
                      end: true,
                    }))
                    if (error) console.error(error)
                    else log_peer('operation terminated')
                  },
              )
            }
          },
          error => {
            if (error) console.error(error)
            log_peer('disconnected')
          },
      )
    })

    const interval = setInterval(() => {
      wss.clients.forEach(ws => {
        if (!ws.alive) {
          ws.force_terminate()
          return
        }

        ws.alive = false
        ws.ping(() => {})
      })
    }, this.#timeout)

    wss.on('close', () => clearInterval(interval))

    http_server.on('upgrade', async (...request_socket_head) => {
      const [request, socket] = request_socket_head
      log('upgrade request from %O', request?.headers?.host)
      try {
        await middleware(request_socket_head)
        const contextValue = await this.context(...request_socket_head)
        const emit_connection = ws =>
          wss.emit(
              'connection', ws, request, contextValue,
          )
        log('authorizing peer to connect')
        wss.handleUpgrade(...request_socket_head, emit_connection)
      } catch (error) {
        console.error(error)
        socket.destroy()
      }
    })
    log('server started!')
    return http_server
  }
}
