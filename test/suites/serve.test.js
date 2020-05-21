import { Serve } from '../../src/index.js'
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
  async *onEvent({ num }) {
    for (;;) {
      await new Promise(resolve => setTimeout(resolve, 1))
      yield { onEvent: num }
    }
  },
}

export default class {
  static name = 'At you service lord king'
  static timeout = 300
  static loop = 1

  #client
  #client2
  #server

  constructor(cleanup) {
    this.#client = new Client({ host: 'ws://0.0.0.0:3000' })
    this.#client2 = new Client({
      host: 'ws://0.0.0.0:3000',
    })
    this.#server = new Server({ port: 3000 })
    cleanup(() => {
      this.#client.disconnect()
      this.#client2.disconnect()
      this.#server.stop()
    })
  }

  async ['shimio server'](affirmation) {
    const limit2 = 10
    const limit3 = 5
    const limit4 = 4
    const limit5 = 6
    const affirm = affirmation(1 + limit2 + limit3 + limit4 + limit5)
    const query = Query(this.#client)
    const query2 = Query(this.#client2)
    const serve = Serve({
      schema, // schema
      rootValue, // optionnal
      contextValue: () => {}, // optionnal
    })

    this.#server.use(serve)

    await this.#server.listen()
    await this.#client.connect()
    await this.#client2.connect()

    const { listen: lstn, stop: stp } = query('{ ping }')

    for await (const { data } of lstn()) {
      affirm({
        that   : 'a graphql query',
        should : 'return a correct result',
        because: data?.ping,
        is     : 'ping pong chin chan',
      })
      stp()
      break
    }

    const string
      = 'subscription($num: Int!) { onEvent(num: $num) }'
    const { listen: l2, stop: s2 } = query(string, {
      num: 2,
    })
    const { listen: l3, stop: s3 } = query(string, {
      num: 3,
    })
    const { listen: l4, stop: s4 } = query2(string, {
      num: 4,
    })
    const { listen: l5, stop: s5 } = query2(string, {
      num: 5,
    })
    const foo = async ({ listen, stop, limit, number }) => {
      let count = 0

      for await (const { data } of listen()) {
        affirm({
          that   : 'a graphql subscription',
          should : 'yield correct results',
          because: data?.onEvent,
          is     : number,
        })
        if (++count >= limit) {
          stop()
          break
        }
      }
    }

    await Promise.all([
      foo({
        listen: l2,
        stop  : s2,
        limit : limit2,
        number: 2,
      }),
      foo({
        listen: l4,
        stop  : s4,
        limit : limit4,
        number: 4,
      }),
      foo({
        listen: l5,
        stop  : s5,
        limit : limit5,
        number: 5,
      }),
      foo({
        listen: l3,
        stop  : s3,
        limit : limit3,
        number: 3,
      }),
    ])

    await new Promise(resolve => setTimeout(resolve, 10))
  }
}
