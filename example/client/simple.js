import debug from 'debug'
import casual from 'casual'
import {
  inspect,
} from 'util'

import {
  Client,
} from '../../src/index.js'

const log = debug('client').extend(casual.username)
const {
  URI = 'ws://localhost:3000/',
} = process.env
const client = new Client({
  ws_options: {
    perMessageDeflate: false,
  },
})
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
const main = async () => {
  await client.connect(URI)
  log('Hello!')
  const response = await client.query(query)
  for await (const m of response) {
    log('received', inspect(
        m, false, Infinity, true,
    ))
  }
}

main()
