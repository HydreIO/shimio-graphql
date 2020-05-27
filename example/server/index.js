import { readFileSync } from 'fs'
import { dirname, join } from 'path'
import { PassThrough } from 'stream'
import { fileURLToPath } from 'url'
import { Server } from '@hydre/shimio'
import Serve from '../../src/serve.js'
import graphql from 'graphql'

const directory = dirname(fileURLToPath(import.meta.url))
const WAIT = 150
const file = readFileSync(
    join(directory, 'schema.gql'),
    'utf-8',
)
const server = Server({
  allow_upgrade: ({ context }) => {
    context.through = new PassThrough({ objectMode: true })
    return true
  },
  on_socket: Serve({
    context: ({ context }) => context,
    schema : graphql.buildSchema(file),
    query  : {
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
  }),
})

await server.listen(3000)
console.log('running on :3000')
