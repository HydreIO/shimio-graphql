import debug from 'debug'
import graphql from 'graphql'
import graphqlError from 'graphql/error'
import http from 'http'
import compose from 'koa-compose'
import { pipeline } from 'stream'
import WebSocket from 'ws'

const log = debug('gql-ws')

const { parse, getOperationAST, execute, subscribe, validate } = graphql
const { GraphQLError } = graphqlError
const GRAPHQL_ERROR = Symbol('graphql_error')

/**
 *
 * @param {Array} array the array to reduce
 * @return an async reducer following the same spec as a vanilla reducer
 */
const async_reduce = array => async (async_callback, initial_value) => {
  let result = initial_value
  let index = 0
  for await (const datas of array) result = await async_callback(datas, array[index], index++, array)
  return result
}

class ProcessingError extends Error {
  constructor(graphql_error) {
    super('processing error')
    this[GRAPHQL_ERROR] = graphql_error
  }
}

/**
 * A reducer to compose multiple queries bloc
 * @param {Object} options
 * @param {graphql.SchemaDefinitionNode} options.schema the graphql schema
 * @param {Object} options.contextValue the graphql context
 * @param {Object} options.rootValue the resolvers
 * @param {log} options.log_peer an unique debug logger for the user
 * @param {Duplex} options.ws_stream the websocket stream
 */
const compose_query_blocs = ({ schema, contextValue, rootValue, log_peer, ws_stream }) => async ({ data: variableValues }, { op_id, query }) => {
  const log_op = log_peer.extend(`op<${op_id}>`)
  log_op('processing query %O', query)
  const document = parse(query)
  const errors = validate(schema, document)

  if (errors.length) {
    log_op('invalid document!')
    throw new ProcessingError(errors)
  }

  const { operation: operation_type, name: operation_name, directives } = getOperationAST(document)
  if (!operation_name) throw new ProcessingError({ errors: [new GraphQLError('Anonymous operations are not supported')], data: null })
  const graphql_options = { schema, rootValue, contextValue, document, variableValues }
  log_op('found directives %O', directives)

  if (operation_type === 'subscription') {
    log_op('operation %s is a subscription', operation_name)
    const maybe_iterator = await subscribe(graphql_options)

    if (maybe_iterator[Symbol.iterator]) {
      log_op('successfully subscribed!')
      // subscribing here
      pipeline(
        maybe_iterator,
        async function*(chunks) { for await (const chunk of chunks) yield JSON.stringify({ op_id, operation_type, operation_name, ...chunk }) },
        ws_stream,
      )
      return { data: variableValues }
    }
    log_op('unable to subscribe!')
    throw new ProcessingError(maybe_iterator)
  } else {
    log_op('operation %s is a %s', operation_name, operation_type)
    const graphql_result = await execute(graphql_options)
    const bloc_result = { operation_name, ...graphql_result }

    if (bloc_result.errors?.length) {
      log_op('operation resulted in an error %O', bloc_result.errors)
      throw new ProcessingError(bloc_result)
    }

    log_op('operation processed: %O', bloc_result)
    return { op_id, operation_name, ...bloc_result }
  }
}

/**
 * A generator handling graphql queries, mutations and subscription. With support for variable export
 */
const graphql_resolve = options => async function*(source) {
  const { log_peer } = options
  log_peer('incoming source of length %d', source.length)

  for await (const message of source) {
    log_peer('processing chunk %O', message.toString())

    // this is the only requirement, the client has to provide a json with all query blocs as an array (operations)
    // the variables will be used by the first bloc and then each bloc will use previous bloc results as variables
    // any error caused by a bloc will stop the processing
    const { operations, variables } = JSON.parse(message.toString())

    try {
      yield async_reduce(operations)(compose_query_blocs(options), { data: variables })
      log_peer('chunk processed.')
    } catch (error) {
      const { [GRAPHQL_ERROR]: graphql_error } = error
      if (graphql_error) yield graphql_error
      else console.error(error)
    }
  }

  log_peer('source processed.')
}

/**
 * The websocket conection handler
 * @param {WebSocket} ws the client websocket
 * @param {http.IncomingMessage} request the http request
 * @param {Object} graphql_option basic graphql option object { `schema`, `contextValue`, `rootValue` }
 */
const handle_client = (ws, { headers }, { schema, contextValue, rootValue }) => {
  const log_peer = log.extend(headers['sec-websocket-key'])
  const ws_stream = WebSocket.createWebSocketStream(ws)
  log_peer('connecting')
  pipeline(ws_stream, graphql_resolve({ schema, contextValue, rootValue, log_peer, ws_stream }), ws_stream)
}

/**
 * Resolve the context to allow usage of dynamic context building
 * @param {Object | Function | AsyncFunction} context
 */
const resolve_context = context => async parameters => {
  if (typeof context === 'object') return context
  return context(...parameters)
}


/**
 * Initialize a graphql websocket server with a configuration object
 * @param {Object} options server options
 * @param {Object} options.ws_options see https://github.com/websockets/ws/blob/master/doc/ws.md#new-websocketserveroptions-callback
 * @param {graphql.SchemaDefinitionNode} options.schema a graphql schema
 * @param {Object} options.rootValue a graphql resolver object
 * @param {Object|Function} options.context the context object or as a function/async function to dynamically build it on every upgrade request
 * */
export default ({
  ws_options = { path: '/', perMessageDeflate: false, maxPayload: 500 },
  schema = (() => { throw new Error('Missing or invalid schema') })(),
  rootValue = (() => { throw new Error('Missing or invalid resolvers') })(),
  context = {},
  web_server = http.createServer(),
}) => {
  const context_resolver = resolve_context(context)
  const middlewares = []

  return {
    use: middlewares.push,
    listen(...parameters) {
      const middleware = compose(middlewares)
      const http_server = web_server.listen(...parameters)

      // we prevent usage of those as it's up to the http server to decide
      // @see https://github.com/websockets/ws/blob/master/doc/ws.md#new-websocketserveroptions-callback
      const { host, port, ...options } = ws_options
      const wss = new WebSocket.Server({ ...options, noServer: true })

      wss.on('connection', handle_client)

      http_server.on('upgrade', async (...request_socket_head) => {
        const [request, socket] = request_socket_head
        log('upgrade request from %O', request?.headers?.host)
        try {
          await middleware(request_socket_head)
          const contextValue = await context_resolver(...request_socket_head)
          wss.handleUpgrade(...request_socket_head, ws => { wss.emit('connection', ws, request, { schema, contextValue, rootValue }) })
        } catch { socket.destroy() }
      })
      log('server started!')
    },
  }
}
