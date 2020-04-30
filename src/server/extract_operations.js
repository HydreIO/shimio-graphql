import graphql from 'graphql'
import graphql_values from 'graphql/execution/values.js'

const {
  visit,
} = graphql

const {
  getVariableValues,
} = graphql_values

export default (schema, document) => {
  let operation = {}
  let operation_name = 'anon'
  let variables_names = []
  const sequence_amount = 1

  const exported_variables = {}

  const operations = new Set()

  visit(document, {
    enter(node, key, parent, path) {
      const {
        kind,
        directives,
        name: {
          value = 'anon',
        } = {},
      } = node

      if (kind === 'OperationDefinition') {
        operation_name = value
        operation = node
        variables_names = node.variableDefinitions.map(
            definition => definition.variable.name.value,
        )
      } else if (directives?.length) {
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

        console.log('exporting', export_name, parent)
        // 3. Let `export_varmap` be the reference of all `@export` variables
        exported_variables[export_name] = path
      }
    },
    leave: {
      OperationDefinition(node) {
        operations.add({
          operation,
          operation_name,
          variables_names,
          exported_variables,
        })
      },
    },
  })
  return [...operations.values()].map(op => {
    const {
      coerced: need,
    } = getVariableValues(
        schema,
        op.operation.variableDefinitions,
        {
          ...op.exported_variables,
        },
    )
    return {
      ...op,
      need,
    }
  })
}
