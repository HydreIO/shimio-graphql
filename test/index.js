import doubt from '@hydre/doubt'
import casual from 'casual'
import graphql from 'graphql'
import gql from 'graphql-tag'
import { pipeline } from 'stream'
import tap_spec from 'tap-spec-emoji'

import { Client, json, Server } from '../src'

pipeline(doubt.stream(), tap_spec(), process.stdout, error => { if (error) console.log(error) })

const { buildASTSchema } = graphql

const port = 3000
const PROCESSING_ERROR = 'processing error'

const typeDefs = gql`
  type Query {
    hello(user: User_input!): String!
    me: User
    ping: String!
  }

  input User_input {
    name: String!
  }

  type User {
    name: String!
  }

  type Mutation {
    sendMessage(message: String!): String!
  }

  type Subscription {
    onMessage: String
  }
`

const resolvers = {
  hello({ user }) {
    return `Hello ${user.name}`
  },
  me(_, { name }) {
    return { name }
  },
  ping: 'pong',
  async *onMessage() {
    yield { onMessage: 'Hello' }
    yield { onMessage: 'Hello' }
  },
}

const context = { name: casual.first_name }

const server = new Server({
  schema: buildASTSchema(typeDefs),
  rootValue: resolvers,
  ws_option: { perMessageDeflate: false },
  context,
  timeout: 100,
})

const client = new Client({ ws_options: { perMessageDeflate: false }, timeout: 150 })

doubt.onStart(() => { server.listen({ port, path: '/' }) })

'The server is a piece of art'.doubt(async () => {
  await 'a client can reach the server'.because(async () => client.connect(`ws://localhost:${port}/`)).pass()

  await 'a query return correct results'.because(async () => {
    const { data: { ping } } = await client.query('{ping}').then(json)
    return ping
  }).isEqualTo('pong')

  await 'a query accessing context return correct results'.because(async () => {
    const { data: { me: { name } } } = await client.query('{ me { name }  }').then(json)
    return name
  }).isEqualTo(context.name)

  await 'a query can use variables'.because(async () => {
    const { data: { hello } } = await client.query('query($user: User_input!) { hello(user: $user) }', { user: { name: context.name } }).then(json)
    return hello
  }).isEqualTo(`Hello ${context.name}`)

  await 'an invalid query is rejected'.because(async () => {
    const { message } = await client.query('{invalid}').then(json)
    return message
  }).isEqualTo(PROCESSING_ERROR)

  await 'a query is rejected when required arguments are not provided'.because(async () => {
    const { message } = await client.query('mutation { sendMessage }').then(json)
    return message
  }).isEqualTo(PROCESSING_ERROR)

  await 'a query is rejected when arguments names are wrong'.because(async () => {
    const { message } = await client.query('mutation($message: String) { sendMessage(mesae: $message) }').then(json)
    return message
  }).isEqualTo(PROCESSING_ERROR)

  await 'a query is rejected when arguments are of the wrong types'.because(async () => {
    const { message } = await client.query('mutation($message: String) { sendMessage(message: $message) }', { message: 0 }).then(json)
    return message
  }).isEqualTo(PROCESSING_ERROR)

  client.disconnect()
})

'The client is not vegan'.doubt(async () => {
  await 'a client can reach the server'.because(async () => client.connect(`ws://localhost:${port}/`)).pass()

  await 'a invalid graphql document throw a syntax error'.because(async () => { await client.query('be gone thot').then(json) }).failsWith('GraphQLError')

  await 'a client can subscribe and receive updates'.because(async () => {
    let found = 0
    // eslint-disable-next-line no-unused-vars
    for await (const _ of await client.query('subscription { onMessage }')) {
      found++
      if (found > 1) return found
    }
  }).isEqualTo(2)

  // await 'a client can unsubscribe'.because(async () => {
  //   // eslint-disable-next-line no-unused-vars
  //   for await (const {id} of await client.query('subscription { onMessage }')) {
  //   }
  // }).isEqualTo(2)
})
