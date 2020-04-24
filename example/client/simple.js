import debug from 'debug'
import gql from 'graphql-tag'

import { Client } from '../../src'

const log = debug('client').extend(`${Math.random() * 9 + 1}`[0])
const { URI = 'ws://localhost:3000/' } = process.env

const client = new Client({ ws_options: { perMessageDeflate: false } })

// const query = gql`
//   query($name: String!) {
//     yay: hello(name: $name)
//   }

//   subscription {
//     onMessage
//   }

//   query named($yay: String!) {
//     me {
//       sayHello(to: $yay)
//     }
//   }
// `

const query = gql`
  query hello {
    ping @foo
  }
`

const main = async () => {
  await client.connect(URI)
  log('Hello!')
  const response = await client.query(query, { name: 'Sceat' })
  log('received: %O', await response.json())
  for await (const m of response) log(m)
}

main()
