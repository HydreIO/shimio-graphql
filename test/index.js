import doubt from '@hydre/doubt'
import tapSpec from 'tap-spec-emoji'
import Websocket from 'ws'

import { listen } from '../src'

doubt.createStream().pipe(tapSpec()).pipe(process.stdout)

const gql_ws_options = {
  // graphql schema
  schema: /* GraphQL */ `
  type Query { ping: String! }
`,
  // resolvers
  root: { ping: () => 'Hello world!' },
  // websocket options
  ws_options: {
    port: 3000,
    path: '/',
    perMessageDeflate: false,
    maxPayload: 500,
  },
  // context built on websocket upgrade and passed to each resolvers
  context: async (request, socket, head) => ({}),
  // if false the socket will be destroyed instead of upgrade, authentication usecases
  validate: async (request, socket, head) => true,
}

'The server handle graphql queries'.doubt(async () => {
  const server = listen({
    schema: /* GraphQL */ `
    type Query { ping: String! }
  `,
    root: { ping: () => 'Hello world!' },
    ws_options: { port: 3000 },
  })

  server.close()
})

