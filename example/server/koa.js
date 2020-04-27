import debug from 'debug'
import { readFileSync } from 'fs'
import graphql from 'graphql'
import gqltools from 'graphql-tools'
import Koa from 'koa'
import { dirname, join } from 'path'
import { PassThrough } from 'stream'
import { fileURLToPath } from 'url'
import { inspect } from 'util'

import { Server } from '../../src'

const log = debug('server')
const { buildSchema, subscribe } = graphql
const { makeExecutableSchema } = gqltools
const directory = dirname(fileURLToPath(import.meta.url))

const passthrough = new PassThrough()

const server = new Server({
  schema: makeExecutableSchema({
    typeDefs: readFileSync(join(directory, 'schema.gql'), 'utf-8'),
    resolvers: {
      Query: {
        me: {
          async *subscribe() {
            await new Promise(resolve => setTimeout(resolve, 1000))
            yield { med: { name: 'pepeg' } }
          },
        },
        // ping: 'pong',
        async *ping() {
          await new Promise(resolve => setTimeout(resolve, 1000))
          yield { ping: 'pong' }
          await new Promise(resolve => setTimeout(resolve, 1000))
          yield { ping: 'pong' }
        },
      },
      Mutation: {
        sendMessage({ message }) {
          passthrough.write(message)
        },
      },
      Subscription: {
        async *me() {
          yield { name: 'fdp' }
        },
        async *onMessage() {
          yield { onMessage: 'Hello' }
          yield { onMessage: 'Hello' }
          yield* passthrough
        },
      },
      User: {
        posts(...arguments_) {
          // log('arguments is', inspect(arguments_, false, null, true))
          return [{ date: 1 }]
        },
      },
      Post: {
        author() {
          log('yield author')
          return [{ name: 'pepeg', posts: [] }]
        },
      },
    },
  }),
  ws_option: { perMessageDeflate: false },
  web_server: new Koa(),
})

server.use(async (context, next) => {
  log('hello from middleware')
  await next()
})

server.listen({ port: 3000, path: '/' }, () => { log('listening on :3000') })
