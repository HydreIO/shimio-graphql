import debug from 'debug'
import { readFileSync } from 'fs'
import graphql from 'graphql'
import Koa from 'koa'
import { dirname, join } from 'path'
import { fileURLToPath } from 'url'

import { Server } from '../../src'

const log = debug('server')
const { buildSchema } = graphql
const directory = dirname(fileURLToPath(import.meta.url))

const server = new Server({
  schema: buildSchema(readFileSync(join(directory, 'schema.gql'), 'utf-8')),
  rootValue: {
    hello: ({ name }) => `Hello ${name} !`,
    me: { sayHello: ({ to }) => `hello ${to}` },
    async *onMessage() {
      while (true) {
        await new Promise(resolve => setTimeout(resolve, 2000))
        yield { onMessage: 'Hello' }
      }
    },
  },
  ws_option: { perMessageDeflate: false },
  web_server: new Koa(),
})

server.use(async (context, next) => {
  log('hello from middleware')
  await next()
})

server.listen({ port: 3000, path: '/' }, () => { log('listening on :3000') })
