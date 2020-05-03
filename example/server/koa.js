import debug from 'debug'
import {
  readFileSync,
} from 'fs'
import gqltools from 'graphql-tools'
import Koa from 'koa'
import {
  dirname, join,
} from 'path'
import {
  PassThrough,
} from 'stream'
import {
  fileURLToPath,
} from 'url'

import {
  Server,
} from '../../src/index.js'

const log = debug('server')
const {
  makeExecutableSchema,
} = gqltools
const directory = dirname(fileURLToPath(import.meta.url))
const passthrough = new PassThrough({
  objectMode: true,
})
const server = new Server({
  schema: makeExecutableSchema({
    typeDefs : readFileSync(join(directory, 'schema.gql'), 'utf-8'),
    resolvers: {
      Query: {
        me() {
          return {
            name: 'pepeg',
          }
        },
        ping() {
          return 'ping pong chin chan'
        },
      },
      Mutation: {
        sendMessage(_, {
          message,
        }) {
          passthrough.write({
            onMessage: message,
          })
          return 'message sent!'
        },
      },
      Subscription: {
        onMessage: {
          async *subscribe() {
            yield* passthrough
          },
        },
      },
    },
  }),
  ws_option: {
    perMessageDeflate: false,
  },
  web_server: new Koa(),
})

server.use(async (context, next) => {
  log('hello from middleware')
  await next()
})

server.listen({
  port: 3000,
  path: '/',
},
() => {
  log('listening on :3000')
})
