import { readFileSync } from 'fs'
import { dirname, join } from 'path'
import { PassThrough } from 'stream'
import { fileURLToPath } from 'url'
import { Server } from '@hydre/shimio'
import Serve from '../../src/serve.js'
import graphql from 'graphql'

const directory = dirname(fileURLToPath(import.meta.url))
const WAIT = 150
const server = new Server({
  port       : 3000,
  uws_options: {
    idleTimeout: 5,
  },
})
const file = readFileSync(join(directory, 'schema.gql'))

server.use(Serve({
  schema: graphql.buildSchema(file, 'utf-8'),
  query : {
    me() {
      return { name: 'pepeg' }
    },
    ping() {
      return 'ping pong chin chan'
    },
  },
  mutation: {
    sendMessage({ message }, { through }) {
      through.write({ onMessage: message })
      return 'message sent!'
    },
  },
  subscription: {
    async *onMessage(_, { through }) {
      for await (const chunk of through) {
        await new Promise(resolve =>
          setTimeout(resolve, WAIT))
        yield chunk
      }
    },
  },
  context: () => ({
    through: new PassThrough({ objectMode: true }),
  }),
}))

await server.listen()
console.log('running on :3000')
