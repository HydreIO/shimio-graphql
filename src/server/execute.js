import graphql from 'graphql'
import graphql_execution_execute from 'graphql/execution/execute'
import graphql_execution_values from 'graphql/execution/values'

const { getVariableValues } = graphql_execution_values
const { assertValidExecutionArguments } = graphql_execution_execute
const { validateSchema, Kind, GraphQLError } = graphql

export default (
  schema,
  document = (() => throw new Error('Must provide document'))(),
  rootValue,
  contextValue,
  variableValues = (() =>
    throw new Error(
      `Variables must be provided as an Object where each property is a
variable value. Perhaps look to see if an unparsed JSON string was provided.`,
    ))(),
  fieldResolver,
  typeResolver,
) => {
  const schema_validation_errors = validateSchema(schema)
    .map(({ message }) => `${message}`)
    .join('\n\n')

  if (schema_validation_errors?.length)
    throw new Error(schema_validation_errors)

  const errors = []
  const fragments = {}
  const operations = document.definitions.filter(definition => {
    const { kind, name: { value } = {} } = definition
    if (kind === Kind.OPERATION_DEFINITION) return true
    if (kind === Kind.FRAGMENT_DEFINITION) fragments[value] = definition
  })

  const topological_operations = []

  while (operations.length) {
    for (let index = 0; index < operations.length; index++) {
      const operation = operations[index]
      const { arguments: arguments_ } =
        operation.directives.find(
          ({ name: { value } = {} }) => value === 'needs',
        ) || {}

      if (!arguments_) {
        const first_layer =
          topological_operations[0] ?? (topological_operations[0] = [])
        first_layer.push(operations.splice(index, 1)[0])
        continue
      }
    }
  }
}

// In fact you can't topo sort because everything is deferred
// just keep a var map and on each update of the map coming from
// the current processed operations, see if there is some values found
// to splice and continue execution

// Every query should return something directly
// then be updated by a yield
// that way the client always has a result
// also provide optimistic results

// fail fast when requiring arguments that no queries export

