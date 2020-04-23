import graphql_error from 'graphql/error'

const { GraphQLError } = graphql_error

export default class Processing_error extends GraphQLError {
  constructor({ id, operation_name, operation_type }, raw_graphql_error) {
    super('processing error')
    Object.assign(this, { ...raw_graphql_error, id, operation_name, operation_type })
  }
}
