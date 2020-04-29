import graphql, {
  visitInParallel,
} from 'graphql'
import graphql_execution_execute from 'graphql/execution/execute'
import graphql_execution_values from 'graphql/execution/values'
import invariant from 'invariant'

const {
  getVariableValues,
} = graphql_execution_values

const {
  assertValidExecutionArguments,
} = graphql_execution_execute

const {
  validateSchema, Kind, GraphQLError, visit,
} = graphql

export default ({
  pid, // 1. Let `pid` be the reference to the current process
  schema,
  document,
  rootValue,
  contextValue,
  variableValues, // 2. Let `varmap` be the cached query Variables
  fieldResolver,
  typeResolver,
}) => {
  invariant(!isNaN(pid), 'Must provide a process id')
  invariant(document, 'Must provide document')

  invariant(
      !variableValues || typeof variableValues === 'object',
      'Variables must be provided as an Object where each property is a' +
      'variable value. Perhaps look to see if an' +
      'unparsed JSON string was provided.',
  )

  const schema_validation_errors = validateSchema(schema)
      .map(({
        message,
      }) => `${ message }`)
      .join('\n\n')

  if (schema_validation_errors?.length)
    throw new Error(schema_validation_errors)

  const errors = []
  const export_varmap = {}
  const satisfied_ops = new Set()
  const reactive_ops = new Set()
  const fragments = {}

  visit(document, {
    enter(node) {
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

      // 3. Let `export_varmap` be the reference of all `@export` variables
      export_varmap[export_name] = null
    },
  })

  document.definitions.forEach(definition => {
    const {
      kind, name: {
        value,
      } = {},
      variableDefinitions,
    } = definition
    if (kind === Kind.OPERATION_DEFINITION) {
      if (!variableDefinitions?.length) satisfied_ops.add(definition)
      else {
        const {
          coerced,
          errors: coerced_errors,
        } = getVariableValues(
            schema,
            variableDefinitions,
            {
              ...variableValues,
              ...export_varmap,
            },
        )
        // TODO: check for cyclic dependencies
        if (coerced_errors?.length) errors.push(...coerced_errors)
        else {
          const is_satisfied = variableDefinitions
              .map(({
                variable: {
                  name: {
                    value: variable_name,
                  },
                },
              }) => value)
            .every(name => name in variableValues)
          // 6. Let `satisfied_ops` be the operations satisfied by `varmap`
          if (is_satisfied) satisfied_ops.add(definition)
          // 4. Let `reactive_ops` be the operations not satisfied by `varmap`
          else reactive_ops.add(definition)
        }
      }
    }
    if (kind === Kind.FRAGMENT_DEFINITION) fragments[value] = definition
  })

  // 5. Fail fast if any `reactive_ops` will never be satisfied by `export_varmap`
  if (errors.length) {
    // stop execution
  }

  // 7. Execute each `satisfied_ops` in parallel
}
