import debug from 'debug'
import { on } from 'events'
import http from 'http'
import compose from 'koa-compose'
import stream from 'stream'
import { promisify } from 'util'
import WebSocket from 'ws'

import Resolver from './resolver'

const log = debug('gql-ws').extend('server')
const pipeline = promisify(stream.pipeline)

export default class {
  #ws_options
  #schema
  #rootValue
  #context
  #web_server

  #middleware = []
  #context_is_static
  #timeout

  /**
  * Initialize a graphql websocket server with a configuration object
  * @param {Object} options - server options
  * @param {Number} [options.timeout=30000] - in millisecond, try to deconnect non reachable clients
  * @param {Object} [options.ws_options] - see https://github.com/websockets/ws/blob/master/doc/ws.md#new-websocketserveroptions-callback
  * @param {graphql.SchemaDefinitionNode} options.schema - a graphql schema
  * @param {Object} options.rootValue - a graphql resolver object
  * @param {(Object|Function)} [options.context={}] - the context object or as a function/async function to dynamically build it on every upgrade request
  */
  constructor({
    ws_options = { path: '/', perMessageDeflate: false, maxPayload: 500 },
    schema = (() => { throw new Error('Missing or invalid schema') })(),
    rootValue = (() => { throw new Error('Missing or invalid resolvers') })(),
    context = {},
    web_server = http.createServer(),
    timeout = 30_000,
  }) {
    this.#ws_options = ws_options
    this.#schema = schema
    this.#rootValue = rootValue
    this.#web_server = web_server
    this.#context = context
    this.#timeout = timeout

    this.#context_is_static = typeof context === 'object'
  }

  /**
   * Resolve the context to allow usage of dynamic context building
   * @param {(Object | Function | AsyncFunction)} context
  */
  async context(...parameters) {
    if (this.#context_is_static) return this.#context
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
    const { host, port, ...options } = this.#ws_options
    const wss = new WebSocket.Server({ ...options, noServer: true })

    wss.on('connection', (ws, { headers }, contextValue) => {
      const log_peer = log.extend(headers['sec-websocket-key'])
      ws.alive = true
      ws.on('pong', () => { ws.alive = true })
      log_peer('connected!')

      const resolver_options = { schema: this.#schema, contextValue, rootValue: this.#rootValue, log_peer, ws }
      pipeline(
        on(ws, 'message'),
        async function*(source) { yield* new Resolver(resolver_options)[Symbol.asyncIterator](source) },
        async source => { for await (const chunk of source) ws.send(chunk) },
      )
    })

    const interval = setInterval(() => {
      wss.clients.forEach(ws => {
        if (!ws.alive) return ws.terminate()
        ws.alive = false
        ws.ping(() => { })
      })
    }, this.#timeout)

    wss.on('close', () => clearInterval(interval))

    http_server.on('upgrade', async (...request_socket_head) => {
      const [request, socket] = request_socket_head
      log('upgrade request from %O', request?.headers?.host)
      try {
        await middleware(request_socket_head)
        const contextValue = await this.context(...request_socket_head)
        const emit_connection = ws => wss.emit('connection', ws, request, contextValue)
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
