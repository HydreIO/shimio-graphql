import { readFileSync } from 'fs'
import gqltools from 'graphql-tools'
import { dirname, join } from 'path'
import { PassThrough } from 'stream'
import { fileURLToPath } from 'url'
import { Server } from '@hydre/shimio'
import graphql from '../../src/serve.js'

const { makeExecutableSchema } = gqltools
const directory = dirname(fileURLToPath(import.meta.url))
const WAIT = 150
const server = new Server({
  port       : 3000,
  uws_options: {
    idleTimeout: 5,
  },
})

server.use(graphql({
  schema: makeExecutableSchema({
    typeDefs: readFileSync(
        join(directory, 'schema.gql'),
        'utf-8',
    ),
    resolvers: {
      Query: {
        me() {
          return { name: 'pepeg' }
        },
        ping() {
          return 'ping pong chin chan'
        },
      },
      Mutation: {
        sendMessage(_, { message }, { through }) {
          through.write({ onMessage: message })
          return 'message sent!'
        },
      },
      Subscription: {
        onMessage: {
          async *subscribe(_, __, { through }) {
            for await (const chunk of through) {
              await new Promise(resolve =>
                setTimeout(resolve, WAIT))
              yield chunk
            }
          },
        },
      },
    },
  }),
  contextValue: () => ({
    through: new PassThrough({ objectMode: true }),
  }),
}))

await server.listen()
console.log('running on :3000')
