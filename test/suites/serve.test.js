import serve_graphql from '../../src/serve.js'
import Query from '../../src/query.js'
import graphql from 'graphql'
import { readFileSync } from 'fs'
import { join, dirname } from 'path'
import { fileURLToPath } from 'url'
import { Server, Client } from '@hydre/shimio'

const directory = dirname(fileURLToPath(import.meta.url))
const { buildSchema } = graphql
const schema = buildSchema(readFileSync(join(directory, 'schema.gql'), 'utf-8'))
const rootValue = {
  ping() {
    return 'ping pong chin chan'
  },
}

export default class {
  static name = 'At you service lord king'
  static timeout = 100

  #client
  #server

  constructor(cleanup) {
    this.#client = new Client({ host: 'ws://0.0.0.0:3000' })
    this.#server = new Server({ port: 3000 })
    cleanup(() => {
      this.#client.disconnect()
      this.#server.stop()
    })
  }

  async ['shimio server'](affirmation) {
    const affirm = affirmation(3)
    const query = Query(this.#client)

    let ran = false

    this.#server.use(async (_, next) => {
      affirm({
        that   : 'middlewares',
        should : 'be executed in order (before)',
        because: ran,
        is     : false,
      })

      await next()

      affirm({
        that   : 'middlewares',
        should : 'be executed in order (after)',
        because: ran,
        is     : true,
      })
    })
    this.#server.use(async (...parameters) => {
      await serve_graphql({
        schema, // schema
        rootValue, // optionnal
        contextValue: {}, // optionnal
      })(...parameters)
      ran = true
    })

    await this.#server.listen()
    await this.#client.connect()

    const { listen, stop } = query('{ ping }')

    for await (const { data } of listen()) {
      affirm({
        that   : 'a graphql query',
        should : 'return a correct result',
        because: data?.ping,
        is     : 'ping pong chin chan',
      })
      stop()
      await new Promise(resolve => setTimeout(resolve, 10))
      return
    }
  }
}
