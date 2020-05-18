import serve_graphql from '../../src/serve.js'
import graphql from 'graphql'
import { readFileSync } from 'fs'
import {
  join, dirname,
} from 'path'
import { fileURLToPath } from 'url'
import { pipeline } from 'stream'
import { Server, Client } from '@hydre/shimio'

const directory = dirname(fileURLToPath(import.meta.url))
const { buildSchema } = graphql
const schema = buildSchema(readFileSync(
    join(
        directory,
        'schema.gql',
    ),
    'utf-8',
))
const rootValue = {
  ping() {
    return 'pong chin chan'
  },
  async *onEvent() {
    for (;;) {
      await new Promise(resolve => setImmediate(resolve, 1))
      yield { onEvent: 'yay' }
    }
  },
}

export default class {
  static name = 'At you service lord king'

  #client
  #server
  #middleware

  constructor(cleanup) {
    this.#client = new Client({ host: 'ws://0.0.0.0:3000' })
    this.#server = new Server({ port: 3000 })
    this.#middleware = serve_graphql({
      schema, // schema
      rootValue, // optionnal
      contextValue: {}, // optionnal
    })
    cleanup(() => {
      this.#client.disconnect()
      this.#server.stop()
    })
  }

  async middleware(affirmation) {
    const affirm = affirmation(2)
    const ran = false

    this.#server.use(async ({ next }) => {
      console.log('before')
      affirm({
        that   : 'middlewares',
        should : 'be executed in order',
        because: ran,
        is     : false,
      })

      await next()

      console.log('after')
      affirm({
        that   : 'middlewares',
        should : 'be executed in order',
        because: ran,
        is     : true,
      })
    })
    this.#server.use(this.#middleware)

    await this.#server.listen()
    await this.#client.connect()
  }
}
