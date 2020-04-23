import graphql from 'graphql'
import graphql_error from 'graphql/error'
import stream, { PassThrough } from 'stream'
import { promisify } from 'util'

import async_reduce from './async_reduce'
import Processing_error from './processing_error'

const { parse, getOperationAST, execute, subscribe, validate } = graphql
const { GraphQLError } = graphql_error
const pipeline = promisify(stream.pipeline)

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
  constructor({ schema, contextValue, rootValue, log_peer, ws }) {
    this.#schema = schema
    this.#logger = log_peer
    this.#ws = ws

    this.#partial_graphql_options = { schema, rootValue, contextValue }
  }

  async handle_subscription({ id, operation_type, operation_name, graphql_options }) {
    const maybe_iterator = await subscribe(graphql_options)
    const through = new PassThrough({ objectMode: true })
    this.#subscriptions.set(id, through)
    if (maybe_iterator[Symbol.asyncIterator]) {
      pipeline(
        maybe_iterator,
        through,
        async function*(source) { for await (const chunk of source) yield `${JSON.stringify({ id, operation_type, operation_name, ...chunk })}` },
        async source => { for await (const chunk of source) this.#ws.send(chunk) },
      )
      return
    }
    throw new Processing_error({ id, operation_type, operation_name }, maybe_iterator)
  }

  static async handle_query({ id, operation_type, operation_name, graphql_options }) {
    const graphql_result = await execute(graphql_options)
    const bloc_result = { operation_name, ...graphql_result }
    if (bloc_result.errors?.length) throw new Processing_error({ id, operation_type, operation_name }, bloc_result)
    return { id, operation_type, operation_name, ...bloc_result }
  }

  // this is the only requirement, the client has to provide a json with all query blocs as an array (operations)
  // the variables will be used by the first bloc and then each bloc will use previous bloc results as variables
  // any error caused by a bloc will stop the processing
  async compose({ id, operations, variables }) {
    const reduce = async_reduce(operations)
    const log_op = this.#logger.extend(`op<${id}>`)
    return reduce(async ({ data: variableValues }, query) => {
      log_op('processing query %O with %O', query, variableValues)
      const document = parse(query)
      const errors = validate(this.#schema, document)

      if (errors.length) {
        log_op('invalid document!')
        throw new Processing_error({ id, operation_type: 'none', operation_name: 'none' }, { errors, data: null })
      }

      const { operation: operation_type, name: { value: operation_name = 'anon' } = {} } = getOperationAST(document)
      const graphql_options = { ...this.#partial_graphql_options, document, variableValues }
      const handler_options = { id, operation_type, operation_name, graphql_options }

      if (operation_type === 'subscription') {
        log_op('operation %O is a subscription', operation_name)
        await this.handle_subscription(handler_options)
        log_op('successfully subscribed!')
        return { data: variableValues }
      }

      log_op('operation %O is a %O', operation_name, operation_type)
      const bloc_result = await Resolver.handle_query(handler_options)
      log_op('operation processed: %O', bloc_result)
      return bloc_result
    }, { data: variables })
  }

  /**
   * A generator handling graphql queries, mutations and subscription. With support for variable export
   */
  async*[Symbol.asyncIterator](source) {
    for await (const chunk of source) {
      const message = JSON.parse(chunk.toString())
      this.#logger('processing chunk %O', message)
      try {
        const response = await this.compose(message)
        this.#logger('yielding %O', response)
        yield `${JSON.stringify(response)}`
        this.#logger('chunk processed.')
      } catch (error) {
        if (error instanceof GraphQLError) yield `${JSON.stringify(error)}`
        else console.error(error)
      }
    }
    this.#logger('disconnected')
  }
}
