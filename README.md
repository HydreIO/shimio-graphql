<h1 align=center>@hydre/graphql-websocket</h1>
<p align=center>
  <img src="https://img.shields.io/github/license/hydreio/graphql-websocket.svg?style=for-the-badge" />
  <a href="https://www.npmjs.com/package/@hydre/graphql-websocket">
    <img src="https://img.shields.io/npm/v/@hydre/graphql-websocket.svg?logo=npm&style=for-the-badge" />
  </a>
  <img src="https://img.shields.io/npm/dw/@hydre/graphql-websocket?logo=npm&style=for-the-badge" />
  <img src="https://img.shields.io/github/workflow/status/hydreio/graphql-websocket/CI?logo=Github&style=for-the-badge" />
</p>

<h3 align=center>A blazing fast graphql websocket server and client</h3>

- Node <kbd>14</kbd>
- Concurrent batched operations leveraging async generators
- Loadbalanced batched subscriptions
- Koa-like Middlewares
- Use with any http framework, or none
- Web & Node client included

## Table of content <!-- omit in toc -->

- [Installation](#installation)
- [Quick start](#quick-start)
  - [Server](#server)
  - [Client](#client)
- [Documentation](#documentation)
- [Client browsers support](#client-browsers-support)

## Installation

```sh
npm install @hydre/graphql-websocket
```

## Quick start

### Server
```js
import Server from '@hydre/graphql-websocket/server'
// coming soon
```

### Client

The client can run either in node or the browser.
You have to provide a PassThrough and a WebSocket implementation

- Node
```js
import { PassThrough } from 'stream'
// import PassThrough from 'minipass' // better
import WebSocket from 'ws'
import make_client from '@hydre/graphql-websocket/client'

const Client = make_client(PassThrough, WebSocket)
const service_a_client = new Client('ws://service-a')
```

- Browser
```js
import { PassThrough } from 'readable-stream'
import make_client from '@hydre/graphql-websocket/client'

// WebSocket already exist in a browser
const Client = make_client(PassThrough, WebSocket)
const service_a_client = new Client('ws://service-a')
```

coming soon

## Documentation


## Client browsers support

- Legal browsers aka Chrome and Firefox, (also edge but meh)
- Should work in safari even if i don't want to admit it.. (fuck off)

I specially use the `Reflect` object to ban Internet explorer from
using this royalty grade graphql client