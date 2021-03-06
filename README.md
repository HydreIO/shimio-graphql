<h1 align=center>@hydre/shimio-graphql</h1>
<p align=center>
  <img src="https://img.shields.io/github/license/hydreio/shimio-graphql.svg?style=for-the-badge" />
  <img src="https://img.shields.io/codecov/c/github/hydreio/shimio-graphql/edge?logo=codecov&style=for-the-badge"/>
  <a href="https://www.npmjs.com/package/@hydre/shimio-graphql">
    <img src="https://img.shields.io/npm/v/@hydre/shimio-graphql.svg?logo=npm&style=for-the-badge" />
  </a>
  <img src="https://img.shields.io/npm/dw/@hydre/shimio-graphql?logo=npm&style=for-the-badge" />
  <img src="https://img.shields.io/github/workflow/status/hydreio/shimio-graphql/CI?logo=Github&style=for-the-badge" />
</p>

<h3 align=center>A GraphQL server and client built on Shimio</h3>

- Node <kbd>^14.3</kbd>
- Concurrent batched operations with [graphql-batch-executor](https://github.com/HydreIO/graphql-batch-executor)
- Server built as a [Shimio](https://github.com/HydreIO/shimio) middleware
- Client as an asyncIterator

## Table of content <!-- omit in toc -->

- [Installation](#installation)
- [Quick start](#quick-start)
  - [Server exemple](#server-exemple)
  - [Client example](#client-example)

## Installation

```sh
npm install @hydre/shimio-graphql
```

## Quick start

### Server exemple
```js
import { readFileSync } from 'fs'
import { dirname, join } from 'path'
import { PassThrough } from 'stream'
import { fileURLToPath } from 'url'
import Server from '@hydre/shimio/server'
import Serve from '@hydre/shimio-graphql/serve'
import graphql from 'graphql'
import Koa from 'koa'

const directory = dirname(fileURLToPath(import.meta.url))
const WAIT = 150
const file = readFileSync(join(directory, 'schema.gql'), 'utf-8')
const server = Server({
  koa: new Koa(),
  // context here is an empty object created by Shimio server
  on_upgrade: ({ context }) => {
    context.through = new PassThrough({ objectMode: true })
    return true
  },
  on_socket: Serve({
    context: async ({
      // the raw upgraded socket
      socket,
      // the raw connection context (in allow_upgrade)
      context,
      // the raw first http request
      request
    }) => ({
      // put whatever you want here
      // this is to build a per-operation context
      // each batch of queries will have a clean context
    }),
    schema: graphql.buildSchema(file),
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
  }),
})

await server.listen(3000)
console.log('running on :3000')
```

### Client example

```js
import debug from 'debug'
import casual from 'casual'
import { inspect } from 'util'
import Client from '@hydre/shimio/client'
import Query from '@hydre/shimio-graphql/query'

// || ===========================================
// || When running in nodejs you need to provide a ws polyfill
// || Browsers have it by default
// ||
import ws from 'ws'
globalThis.WebSocket = ws
// ||
// || ===========================================

// see options in @hydre/shimio
const client = Client({ host: 'ws://0.0.0.0:3000' })
const query = Query(client)
const END = 2000

await client.connect()

const {
  listen, // an asyncIterator yielding updates
  stop, // close the channel
  once // promise of the first result only
} = await query(/* GraphQL */ `
 query pang {
   ping
 }

 mutation hello {
   first: sendMessage(message: "howdy")
   then: sendMessage(message: "pls sir show vagana")
 }

 subscription hey_listen {
   onMessage
 }
`)

setTimeout(() => {
  stop() // unsubscribe from operation
}, END)

for await (const chunk of listen())
  console.log('received', inspect(chunk, false, Infinity, true))

client.disconnect()
```

