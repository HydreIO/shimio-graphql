import debug from 'debug'
import Graphql from 'graphql'
import http from 'http'
import WebSocket from 'ws'

import handle_client from './client'

const log = debug('gql-ws')

const { buildSchema } = Graphql

const default_server_options = {
  path: '/',
  perMessageDeflate: false,
  maxPayload: 500,
}

const resolve_context = context => async parameters => {
  if (typeof context === 'object') return context
  return context(...parameters)
}

export default ({ ws_options = default_server_options, schema, root, context = {}, validate = () => true }) => {
  if (typeof schema !== 'string') throw new Error('The schema is either undefined or invalid')
  if (typeof root !== 'object') throw new Error('The root resolver is not an object')

  const built_schema = buildSchema(schema)
  const context_resolver = resolve_context(context)

  // ws only allow passing only one of server, port and noServer.
  // to comply with the spec but still always take control of the http server
  // we extract both http server and port value while still using them after creating the WebSocket server
  // @see https://github.com/websockets/ws/blob/master/doc/ws.md#new-websocketserveroptions-callback
  const { server: http_server = http.createServer().listen({ port: 3000, ...ws_options }), port, ...options } = ws_options
  const wss = new WebSocket.Server({ ...options, noServer: true })
  wss.on('connection', handle_client)

  http_server.on('upgrade', async (...request_socket_head) => {
    const [request, socket] = request_socket_head
    log('upgrade request from %O', request?.headers?.host)
    try {
      // simply allowing usage of synchrone validation
      const async_validation = async () => validate(...request_socket_head)
      const is_valid = await async_validation()
      if (!is_valid) return
      const resolved_context = await context_resolver(...request_socket_head)
      wss.handleUpgrade(...request_socket_head, ws => { wss.emit('connection', ws, request, { built_schema, resolved_context, root }) })
    } catch (error) {
      socket.destroy()
    }
  })
}
