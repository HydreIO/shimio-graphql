import graphql from 'graphql'
import graphql_error from 'graphql/error'
import {
  pipeline,
} from 'stream'
import {
  inspect,
} from 'util'

import deep_flatten from './deep_flatten'
import Processing_error from './processing_error'

const {
  parse, getOperationAST, execute, subscribe, validate,
} = graphql
const {
  GraphQLError,
} = graphql_error
const noop = () => { }

const tap = async function* (source, fn) {
  for await (const chunk of source) {
    fn.call(fn, chunk)
    yield chunk
  }
}

export default class Resolver {
  #schema
  #logger
  #ws

  #partial_graphql_options
  #subscriptions = new Map()

  /**
   * An async iterator that compose multiple query blocs and propagate variables
   * @param {Object} options
   * @param {graphql.SchemaDefinitionNode} options.schema the graphql schema
   * @param {Object} options.contextValue the graphql context
   * @param {Object} options.rootValue the resolvers
   * @param {log} options.log_peer an unique debug logger for the user
   * @param {Duplex} options.ws the websocket
   */
  constructor({
    schema, contextValue, rootValue, log_peer, ws,
  }) {
    this.#schema = schema
    this.#logger = log_peer
    this.#ws = ws

    this.#partial_graphql_options = {
      schema,
      rootValue,
      contextValue,
    }
  }

  async process_subscription({
    id, operation_type, operation_name, graphql_options,
  }) {
    this.#logger('processing subscription %O', {
      id,
      operation_type,
      operation_name,
      'graphql_options.variableValue': graphql_options.variableValues,
    })
    const maybe_iterator = await subscribe(graphql_options)
    if (maybe_iterator[Symbol.asyncIterator]) {
      pipeline(
          maybe_iterator,
          async function* (source) {
            for await (const chunk of source) {
              yield `${ JSON.stringify({
                id,
                operation_type,
                operation_name,
                ...chunk,
              }) }`
            }
          },
          async source => {
            for await (const chunk of source) this.#ws.send(chunk)
          },
          noop,
      )
      return {
        id,
        operation_type,
        operation_name,
        data: graphql_options.variableValues,
      }
    }
    throw new Processing_error({
      id,
      operation_type,
      operation_name,
    }, maybe_iterator)
  }

  async process_query({
    id, operation_type, operation_name, graphql_options,
  }) {
    this.#logger('processing query %O', {
      id,
      operation_type,
      operation_name,
      'graphql_options.variableValue': graphql_options.variableValues,
    })
    const graphql_result = await execute(graphql_options)
    const bloc_result = {
      operation_name,
      ...graphql_result,
    }
    if (bloc_result.errors?.length) {
      throw new Processing_error({
        id,
        operation_type,
        operation_name,
      }, bloc_result)
    }
    return {
      id,
      operation_type,
      operation_name,
      ...bloc_result,
    }
  }

  /**
   * Take an incomming query that may contains multiple bloc and output processing datas for each bloc
   */
  * process_operation({
    id, operations, variables,
  }) {
    const log_op = this.#logger.extend(`op<${ id }>`)
    for (const operation of operations) {
      const document = parse(operation, {
        noLocation: true,
      })
      const errors = validate(this.#schema, document)
      if (errors.length) {
        log_op('invalid document!')
        throw new Processing_error({
          id,
          operation_type: 'none',
          operation_name: 'none',
        }, {
          errors,
          data: null,
        })
      }
      const {
        operation: operation_type, name: {
          value: operation_name = 'anon',
        } = {},
      } = getOperationAST(document)
      yield (variableValues = variables) => ({
        id,
        operation_type,
        operation_name,
        graphql_options: {
          ...this.#partial_graphql_options,
          document,
          variableValues,
        },
      })
    }
  }

  /**
   * A generator handling graphql queries, mutations and subscription. With support for variable export
   */
  * [Symbol.asyncIterator](external_source) {
    const self = this
    yield* pipeline(
        tap(external_source, chunk => {
          this.#logger('processing chunk %O', chunk)
        }),
        async source => {
          for await (const chunk of source) {
            try {
              let result
              for await (const build_processing_options of self.process_operation(JSON.parse(chunk.toString()))) {
                const processing_options = build_processing_options(result?.data)
                switch (processing_options.operation_type) {
                  case 'subscription':
                    result = await self.process_subscription(processing_options)
                    break

                  case 'query':
                  case 'mutation':
                    result = await self.process_subscription(processing_options)
                    // result = await self.process_query(processing_options)
                    break

                  default:
                    throw new Error(`This library version doesn't support the ${ processing_options.operation_type } operation.`)
                }
              }

              // self.#logger('yielding %O', result)
              // yield JSON.stringify(result)
              self.#logger('chunk processed.')
            } catch (error) {
              console.log(error)
            // if (error instanceof GraphQLError) yield JSON.stringify(error)
            // else console.error(error)
            }
          }
        },
        error => {
          if (error) console.error(error)
          self.#logger('disconnected')
        },
    )
  }
}
