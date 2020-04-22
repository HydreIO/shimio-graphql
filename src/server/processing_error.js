import { GRAPHQL_ERROR } from './symbols'

export default class ProcessingError extends Error {
  constructor(graphql_error) {
    super('processing error')
    this[GRAPHQL_ERROR] = graphql_error
  }
}
