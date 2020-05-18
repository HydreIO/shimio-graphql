import debug from 'debug'
import { readFileSync } from 'fs'
import gqltools from 'graphql-tools'
import Koa from 'koa'
import { dirname, join } from 'path'
import { PassThrough } from 'stream'
import { fileURLToPath } from 'url'

import Server from '../../src/server.js'

const log = debug('server')
const { makeExecutableSchema } = gqltools
const directory = dirname(fileURLToPath(import.meta.url))
const passthrough = new PassThrough({ objectMode: true })
const WAIT = 150
const server = new Server({
  schema: makeExecutableSchema({
    typeDefs : readFileSync(join(directory, 'schema.gql'), 'utf-8'),
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
        sendMessage(_, { message }) {
          passthrough.write({ onMessage: message })
          return 'message sent!'
        },
      },
      Subscription: {
        onMessage: {
          async *subscribe() {
            for await (const chunk of passthrough) {
              await new Promise(resolve => setTimeout(resolve, WAIT))
              yield chunk
            }
          },
        },
      },
    },
  }),
  ws_option : { perMessageDeflate: false },
  web_server: new Koa(),
})

server.use(async (context, next) => {
  log('hello from middleware')
  await next()
})

server.listen(
    {
      port: 3000,
      path: '/',
    },
    () => {
      log('listening on :3000')
    },
)
