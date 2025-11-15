<h1 align=center>@hydre/shimio-graphql</h1>
<p align=center>
  <img src="https://img.shields.io/badge/license-Unlicense-blue.svg?style=for-the-badge" />
  <img src="https://img.shields.io/codecov/c/github/hydreio/shimio-graphql/master?logo=codecov&style=for-the-badge"/>
  <a href="https://www.npmjs.com/package/@hydre/shimio-graphql">
    <img src="https://img.shields.io/npm/v/@hydre/shimio-graphql.svg?logo=npm&style=for-the-badge" />
  </a>
  <img src="https://img.shields.io/npm/dw/@hydre/shimio-graphql?logo=npm&style=for-the-badge" />
</p>

<h3 align=center>A GraphQL server and client built on Shimio</h3>

## Features

- **Node.js**: >= 20.0.0
- **GraphQL v16**: Full support for the latest GraphQL spec
- **Concurrent batched operations** with [graphql-batch-executor](https://github.com/HydreIO/graphql-batch-executor)
- **Server** built as a [Shimio](https://github.com/HydreIO/shimio) middleware
- **Client** as an async iterator
- **Real-time subscriptions** over multiplexed WebSocket channels

## What's New in v6.0.0

- ✨ Upgraded to GraphQL v16.9.0 (from v15.4.0)
- 🚀 Node.js 20+ support with native language features
- 📦 Updated to @hydre/shimio v5.0.0 (ws v8)
- 🧹 Removed Babel dependencies (no longer needed for modern Node.js)
- 🔧 Modernized development dependencies
- 💯 All tests passing with GraphQL v16

## Table of content <!-- omit in toc -->

- [Installation](#installation)
- [Requirements](#requirements)
- [Quick start](#quick-start)
  - [Server example](#server-example)
  - [Client example](#client-example)
- [Migration from v5.x](#migration-from-v5x)

## Installation

```sh
npm install @hydre/shimio-graphql
```

## Requirements

- **Node.js**: >= 20.0.0
- **GraphQL**: v16.x
- **@hydre/shimio**: v5.x

## Quick start

### Server example
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



## Migration from v5.x

### Breaking Changes

#### GraphQL v16

shimio-graphql v6.0.0 uses GraphQL v16, which has breaking changes from v15:

1. **Type system changes**: Some internal type definitions have changed
2. **Execution changes**: Minor improvements to subscription execution
3. **Deprecated features removed**: Some v15 deprecations are now removed

**Most users won't need code changes** - the GraphQL v16 upgrade is largely internal. If you use custom GraphQL directives or advanced schema manipulation, review the [GraphQL v16 changelog](https://github.com/graphql/graphql-js/releases/tag/v16.0.0).

#### @hydre/shimio v5

shimio-graphql v6 requires @hydre/shimio v5.x (which uses ws v8). See the [@hydre/shimio migration guide](https://github.com/HydreIO/shimio#migration-from-v4x) for details.

**No code changes needed** if you only use `@hydre/shimio-graphql/serve` and `@hydre/shimio-graphql/query`.

### Node.js Version

Upgrade to Node.js >= 20.0.0 before upgrading to v6.0.0.

### No API Changes

The shimio-graphql API remains unchanged:
- `Serve()` server middleware: same API
- `Query()` client: same API
- All examples from v5 work in v6

Simply update your dependencies:

```sh
npm install @hydre/shimio@^5.0.0 @hydre/shimio-graphql@^6.0.0 graphql@^16.0.0
```

