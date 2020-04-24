import debug from 'debug'
import graphql from 'graphql'
import { inspect } from 'util'

const { parse, visit, validate, buildSchema } = graphql
const log = debug('ast')
const log_node = log.extend('node')
const log_key = log.extend('key')
const log_parent = log.extend('parent')
const log_path = log.extend('path')
const log_ancestors = log.extend('ancestors')

const schema = /* GraphQL */`
directive @unwind(_: Scalar) on QUERY | MUTATION | SUBSCRIPTION

type Query {
  """
  ping pong chin chan
  """
  ping: String
  me: User!
  say_hello(to: String!): String
}

type User {
  name: String!
}

# query cheated ($names: [String!]!) @unwind(_:$names, as: "name") {
#   ping
# }

`

const query = parse(/* GraphQL */`

query foo ($name: String!) @unwind(_: $names, as: "name") {
  ping

  me {
    name
  }

  say_hello(to: $name)
}
`, { noLocation: true })

// visit(schema, {
//   FieldDefinition(node, key, parent, path) {
//     log_node(inspect(node, false, null, true))
//     log_key(inspect(key, false, null, true))
//     log_parent(inspect(parent, false, null, true))
//     log_path(inspect(path, false, null, true))
//     log('===================')
//   },
//   // enter(node, key, parent, path, ancestors) {
//   // },
//   // leave(node, key, parent, path, ancestors) {
//   // },
// })
log(inspect(query, false, null, true))
log(validate(buildSchema(schema), query))
// if (!valid.length) log(inspect(query, false, null, true))
// else log.extend('schema')('%O', valid)