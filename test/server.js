import debug from 'debug'
import Koa from 'koa'

import gql_ws from '../src'

const app = new Koa()
const log = debug('gql-ws')
const { PORT = 3000, HOST = 'sdev', WS_PATH = '/' } = process.env

const gql_ws_options = {
  // graphql schema
  schema: /* GraphQL */ `
  type Query { ping: String! }
`,
  // resolvers
  root: { ping: () => 'Hello world!' },
  // websocket options
  ws_options: {
    server: app.listen({ port: PORT, host: HOST, path: WS_PATH }),
    perMessageDeflate: false,
    maxPayload: 500,
  },
  // context built on websocket upgrade and passed to each resolvers
  // context: async (request, socket, head) => ({}),
  // if false the socket will be destroyed instead of upgrade, authentication usecases
  // validate: async (request, socket, head) => true,
}

gql_ws(gql_ws_options)
log(`listening on ws://${HOST}:${PORT}${WS_PATH}`)
