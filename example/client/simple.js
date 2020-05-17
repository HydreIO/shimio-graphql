import debug from 'debug'
import casual from 'casual'
import { inspect } from 'util'
import { PassThrough } from 'stream'
import WebSocket from 'ws'
import make_client from '../../src/client.js'

const Client = make_client(
    PassThrough,
    WebSocket,
)
const log = debug('client').extend(casual.username)
const client = new Client('ws://localhost:3000/')
const query = /* GraphQL */ `
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
`
const END = 5000
const main = async () => {
  await client.connect()
  log('Hello!')

  const response = await client.query(query)

  setTimeout(
      () => {
        response.end() // unsubscribe from operation
      },
      END,
  )

  for await (const m of response) {
    log(
        'received',
        inspect(
            m,
            false,
            Infinity,
            true,
        ),
    )
  }


  client.disconnect()
}

main()
