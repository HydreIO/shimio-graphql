import debug from 'debug'
import { readFileSync } from 'fs'
import graphql from 'graphql'
import Koa from 'koa'
import { dirname, join } from 'path'
import { PassThrough } from 'stream'
import { fileURLToPath } from 'url'

import { Server } from '../../src'

const log = debug('server')
const { buildSchema } = graphql
const directory = dirname(fileURLToPath(import.meta.url))

const passthrough = new PassThrough()

const rootValue = {
  hello({ user }) {
    return `Hello ${user.name}`
  },
  me(_, { name }) {
    return { name }
  },
  ping: 'pong',
  sendMessage({ message }) {
    passthrough.write(message)
  },
  async *onMessage() {
    yield { onMessage: 'Hello' }
    yield { onMessage: 'Hello' }
    yield* passthrough
  },
}


const server = new Server({
  schema: buildSchema(readFileSync(join(directory, 'schema.gql'), 'utf-8')),
  rootValue,
  ws_option: { perMessageDeflate: false },
  web_server: new Koa(),
})

server.use(async (context, next) => {
  log('hello from middleware')
  await next()
})

server.listen({ port: 3000, path: '/' }, () => { log('listening on :3000') })
