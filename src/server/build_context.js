import graphql from 'graphql'
import graphql_values from 'graphql/execution/values.js'

const {
  visit,
  Kind,
} = graphql

const {
  getVariableValues,
} = graphql_values

export default (schema, document, default_variables) => {
  let operation = {}
  let operation_name = 'anon'
  let variables_names = []
  let exported_variables = []
  const fragments = {}
  const operations = new Set()
  const variables_map = default_variables

  visit(document, {
    // eslint-disable-next-line max-params
    enter(node, key, parent, path) {
      const {
        kind,
        directives,
        name: {
          value = 'anon',
        } = {},
      } = node

      switch (kind) {
        case Kind.OPERATION_DEFINITION:
          operation_name = value
          operation = node
          variables_names = node.variableDefinitions.map(
              definition => definition.variable.name.value,
          )
          exported_variables = []
          return

        case Kind.FRAGMENT_DEFINITION:
          fragments[value] = node
          return

        case Kind.FIELD:
          if (!directives?.length) return

          const exported = directives.find(
              directive => directive?.name?.value === 'export',
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

          // 3. Let `export_varmap` be the reference of all `@export` variables
          exported_variables.push(export_name)
          variables_map[export_name] = undefined

        // no default
      }
    },
    leave: {
      OperationDefinition() {
        operations.add({
          operation,
          operation_name,
          variables_names,
          exported_variables,
        })
      },
    },
  })

  const operation_errors = []
  const operation_context = [...operations.values()].map(op => {
    const {
      coerced,
      errors,
    } = getVariableValues(
        schema,
        op.operation.variableDefinitions,
        variables_map,
    )

    if (errors?.length) operation_errors.push(errors)
    return {
      ...op,
      needed_variables: Object.keys(coerced),
    }
  })

  return {
    errors: operation_errors,
    contexts: operation_context,
    fragments,
  }
}
