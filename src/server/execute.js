import graphql from 'graphql'
import graphql_execution_execute from 'graphql/execution/execute'
import graphql_execution_values from 'graphql/execution/values'
import invariant from 'invariant'
import topological_matrix from './topological_matrix.js'
import build_context from './build_context.js'

const {
  getVariableValues,
} = graphql_execution_values

const {
  assertValidExecutionArguments,
  collectFields,
  getFieldDef,
} = graphql_execution_execute

const {
  validateSchema, Kind,
  GraphQLError, visit,
  getOperationRootType,
} = graphql

const sort_operation = (values, variables = {}) => {
  try {
    return topological_matrix({
      values,
      depends_on({
        exported_variables: first_exports,
        needed_variables: first_needs,
      }, {
        exported_variables: second_exports,
        needed_variables: second_needs,
      }) {
        return first_needs.some(needed => {
          if (Object.keys(variables).includes(needed)) return false
          return second_exports.includes(needed)
        })
      },
    })
  } catch (error) {
    console.error('oops, unsatisfied operation', error)
    return {
      errors: [new GraphQLError('Unsatisfied operation')],
    }
  }
}

const execute_operation = ({
  schema,
  fragments,
  rootValue,
  contextValue,
  variableValues,
  operation,
  build_resolver,
  static_resolver,
  subscribe_resolver,
}) => {
  const type = getOperationRootType(schema, operation)

  const execution_context = {
    schema,
    fragments,
    rootValue,
    contextValue,
    operation,
    variableValues,
  }

  const fields = collectFields(
      execution_context,
      type,
      operation.selectionSet,
      {},
      {},
  )

  switch (operation.operation) {
    case 'query':
      Object.entries(fields).map(async ([response_name, ]))
      for (const [field_name, [field_node]] of Object.entries(fields)) {

      }
      break

    default:
      break
  }
}

export default ({
  pid, // 1. Let `pid` be the reference to the current process
  schema,
  document,
  rootValue,
  contextValue,
  variableValues, // 2. Let `varmap` be the cached query Variables
  resolvers,
  defaultBuildResolver,
  defaultResolver,
  defaultSubscriptionResolver,
}) => {
  invariant(Number.isInteger(pid), 'Must provide a valid process id')
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

  if (schema_validation_errors?.length) throw schema_validation_errors

  const {
    contexts,
    errors: context_errors,
    fragments,
  } = build_context(schema, document, variableValues)

  // fail fast
  if (context_errors.length) throw context_errors

  const {
    result,
    errors: sort_errors,
  } = sort_operation(contexts, variableValues)

  // 5. Fail fast if any operations will never be satisfied
  if (sort_errors.length) throw sort_errors

  // 4. Let `reactive_ops` be the operations not satisfied by varmap
  // 6. Let `satisfied_ops` be the operations satisfied by `varmap`
  const [
    satisfied_operations,
    ...reactive_operations
  ] = result

  // 7. Execute each `satisfied_ops` in parallel
  for (const operation of satisfied_operations) {

  }
}
