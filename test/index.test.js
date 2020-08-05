/* eslint-disable max-lines */
import Doubt from '@hydre/doubt'
import reporter from 'tap-spec-emoji'
import { pipeline, PassThrough } from 'stream'
import ws from 'ws'
import Koa from 'koa'
import { readFileSync } from 'fs'
import { join, dirname } from 'path'
import { fileURLToPath } from 'url'
import Server from '@hydre/shimio/server'
import Client from '@hydre/shimio/client'
import make_schema from '@hydre/graphql-batch-executor/make_schema'
import Serve from '../src/serve.js'
import Query from '../src/query.js'
import object_buffer from '../src/object_buffer.js'

globalThis.WebSocket = ws

const through = new PassThrough()
const koa = new Koa()
const directory = dirname(fileURLToPath(import.meta.url))

pipeline(through, reporter(), process.stdout, () => {})

const doubt = Doubt({
  stdout: through,
  title : 'Shimio graphql',
  calls : 30,
})
const ltr = object_buffer.ltr({})
const rtl = object_buffer.rtl(new ArrayBuffer(0))
const round_trip = object_buffer.rtl(object_buffer.ltr({ foo: 'bar' }))

doubt['LTR should morph an object into a arraybuffer']({
  because: ltr instanceof ArrayBuffer,
  is     : true,
})

doubt['RTL should morph an arraybuffer into an object']({
  because: rtl,
  is     : {},
})

doubt['object_buffer should be a valid isomorph']({
  because: round_trip,
  is     : { foo: 'bar' },
})

const server = Server({
  koa,
  on_upgrade: ({ context }) => {
    context.ping_pong = 'ping pong chin chan'
    return true
  },
  on_socket: Serve({
    context: ({ context }) => context,
    schema : make_schema({
      document : readFileSync(join(directory, 'schema.gql'), 'utf-8'),
      resolvers: {
        Query: {
          ping(_, __, { ping_pong }) {
            return ping_pong
          },
        },
        Subscription: {
          onEvent: {
            async *subscribe(_, { num }) {
              for (;;) {
                await new Promise(resolve => setTimeout(resolve, 1))
                yield { onEvent: num }
              }
            },
          },
        },
      },
    }),
  }),
  time_between_connections: -1,
})
const client_1 = Client({ host: 'ws://0.0.0.0:3080' })
const client_2 = Client({ host: 'ws://0.0.0.0:3080' })

await server.listen(3080)
await client_1.connect()
await client_2.connect()

const query_1 = Query(client_1)
const query_2 = Query(client_2)
const result_1 = await query_1('{ ping }')

doubt['querying once should return a unique result']({
  because: (await result_1.once()).data,
  is     : { ping: 'ping pong chin chan' },
})

try {
  Query()
} catch (error) {
  doubt['querying without a client is dumb']({
    because: error.message,
    is     : 'Missing client',
  })
}

const sub = 'subscription($num: Int!) { onEvent(num: $num) }'
const result_1_1 = await query_1(sub, { num: 2 })
const result_1_2 = await query_1(sub, { num: 3 })
const result_2_1 = await query_2(sub, { num: 4 })
const result_2_2 = await query_2(sub, { num: 5 })
const start = async ({ result, limit, number }) => {
  let count = 0

  const source = result.listen()

  for await (const { data } of source) {
    doubt['a graphql subscription yield correct results']({
      because: data?.onEvent,
      is     : number,
    })
    if (++count >= limit) {
      result.stop()
      return
    }
  }
}

await Promise.all([
  start({
    result: result_1_1,
    limit : 10,
    number: 2,
  }),
  start({
    result: result_1_2,
    limit : 5,
    number: 3,
  }),
  start({
    result: result_2_1,
    limit : 4,
    number: 4,
  }),
  start({
    result: result_2_2,
    limit : 6,
    number: 5,
  }),
])
await server.close()
