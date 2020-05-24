import { inspect } from 'util'
import ws from 'ws'
import { Client } from '@hydre/shimio'
import Query from '../../src/query.js'
import EventTarget from '@hydre/shimio/test/EventTarget.js'
import Event from '@hydre/shimio/test/Event.js'

// RUNNING IN NODE.JS INSTEAD OF A BROWSER NEEDS THOSE 3 POLYFILLS

// eslint-disable-next-line no-undef
globalThis.WebSocket = ws
// eslint-disable-next-line no-undef
globalThis.EventTarget = EventTarget
// eslint-disable-next-line no-undef
globalThis.Event = Event

const client = new Client({ host: 'ws://0.0.0.0:3000' })
const query = Query(client)
const END = 2000

await client.connect()

const { listen, stop } = await query(/* GraphQL */ `
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

for await (const m of listen())
  console.log('received', inspect(m, false, Infinity, true))

client.disconnect()
