import debug from 'debug'
import gql from 'graphql-tag'

import { Client } from '../../src'

const log = debug('client').extend(`${Math.random() * 9 + 1}`[0])
const { URI = 'ws://localhost:3000/' } = process.env

const main = async () => {
  const foo = await Client({
    address: URI,
    options: { perMessageDeflate: false },
  })

  log('ping!')
  const response = await foo(gql`
  query($name: String!) {
    yay: hello(name: $name)
  }

  subscription {
    onMessage
  }

  query named($yay: String!) {
    me {
      sayHello(to: $yay)
    }
  }

  `, { name: 'Sceat' })

  log('received: %O', await response.json())
  for await (const m of response) {
    log(m)
  }
}

main()
