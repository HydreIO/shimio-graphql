import debug from 'debug'
import graphql from 'graphql'
import graphql_values from 'graphql/execution/values.js'
import {
  inspect,
} from 'util'

const {
  parse, visit, validate, buildSchema, buildASTSchema,
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
  directive @unwind(
    _: String
    as: String
  ) on QUERY | FIELD_DEFINITION | FRAGMENT_SPREAD | INLINE_FRAGMENT | FRAGMENT_DEFINITION | MUTATION | SUBSCRIPTION

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
    query foo ($pepeg: String!) {
      me @export {
        ... on User {
          name(as: $pepeg) @export
        }
        ...test
      }
    }

    fragment test on User {
      frag: name @export
    }
  `,
    {
      noLocation: true,
    },
)

visit(query2, {
  OperationDefinition(node, key, parent, path) {
    // log.extend('operation')('%i', node)
    const {
      directives,
    } = node

    if (!directives?.length) return

    const exported = directives.find(
        ({
          name: {
            value,
          },
        }) => value === 'export',
    )

    if (!exported) return

    const {
      name: {
        value: field_name,
      },
    } = node

    const [export_argument] = exported.arguments

    // either we have an `as` argument,
    // or we fallback to the field name
    const {
      value: {
        value: export_name,
      },
    } = export_argument || {
      value: {
        value: field_name,
      },
    }
    $pepeg
    // if (value !== 'export') return
    // log('%i', export_name)
  },
  // enter(node, key, parent, path, ancestors) {
  // },
  // leave(node, key, parent, path, ancestors) {
  // },
})
log('%i', getVariableValues(
    buildSchema(schema),
    query2.definitions[0].variableDefinitions, {
      pepeg: 'pepeg',
      mario: `it's a me`,
    }))
log(validate(buildASTSchema(parse(schema)), query2))
// if (!valid.length) log(inspect(query, false, null, true))
// else log.extend('schema')('%O', valid)
