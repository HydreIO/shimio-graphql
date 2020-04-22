import doubt from '@hydre/doubt'
import { readFileSync } from 'fs'
import graphql from 'graphql'
import { dirname, join } from 'path'
import tapSpec from 'tap-spec-emoji'
import { fileURLToPath } from 'url'

import { Client, Server } from '../src'

doubt.createStream().pipe(tapSpec()).pipe(process.stdout)

const { buildSchema } = graphql
const directory = dirname(fileURLToPath(import.meta.url))

const port = 3000

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
})

server.listen({ port, path: '/' }, () => { console.log('listening on :3000') })

'The server handle graphql queries'.doubt(async () => {
  const client = new Client({ address: `ws://localhost:${port}/`, options: { perMessageDeflate: false } })
  await client.connect()
  await 'query result is valid'.because(async () => client.query('{ hello(name: "Sceat") }')).isDeeplyEqualTo({ data: { hello: 'Hello Sceat !' } })
})
