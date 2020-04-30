import debug from 'debug'
import graphql from 'graphql'
import graphql_values from 'graphql/execution/values.js'
import {
  inspect,
} from 'util'
import extact_operations from '../src/server/extract_operations.js'

const {
  parse, visit, validate, buildSchema, buildASTSchema, execute,
  GraphQLObjectType, GraphQLString, GraphQLSchema,
} = graphql

const {
  getVariableValues, getArgumentValues, getDirectiveValues,
} = graphql_values

const log = debug('ast')

debug.formatters.i = object => inspect(object, false, null, true)

const log_node = log.extend('node')
const log_key = log.extend('key')
const log_parent = log.extend('parent')
const log_path = log.extend('path')
const log_ancestors = log.extend('ancestors')

const schema = /* GraphQL */ `
  directive @export(as: String) on FIELD

  type Query {
    """
    ping pong chin chan
    """
    ping: String
    me: User!
    say_hello(pepeg: String!): String
  }

  type User {
    name(as: String): String!
  }

  # query cheated ($names: [String!]!) @unwind(_:$names, as: "name") {
  #   ping
  # }
`

const query2 = parse(
    /* GraphQL */ `
    query foo ($pepeg: String)  {
      me {
        name @export
      }
    }

    query bar  {
      me {
        name @export (as: "pepeg")
      }
    }
  `,
    {
      noLocation: true,
    },
)


// Define the User type
const userType = new GraphQLObjectType({
  name: 'User',
  fields: {
    name: {
      type: GraphQLString,
      resolve: () => 'salut',
    },
  },
})

// Define the Query type
const queryType = new GraphQLObjectType({
  name: 'Query',
  fields: {
    me: {
      type: userType,
      extensions: [function build() { }],
      resolve: () => ({}),
    },
  },
})

// const result = execute(new GraphQLSchema({
//   query: queryType,
// }), query2, {}, {}, {
//   pepeg: 'pepeg',
//   mario: `it's a me`,
// })
log('%i', extact_operations(buildASTSchema(parse(schema)), query2))
// log('%i', parse(schema))

// log('%i', getDirectiveValues(parse(schema).definitions[0], query2))

// log(validate(buildASTSchema(parse(schema)), query2))
// if (!valid.length) log(inspect(query, false, null, true))
// else log.extend('schema')('%O', valid)
