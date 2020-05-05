import debug from 'debug'
import graphql from 'graphql'

const log = debug('gql-ws').extend('client')
const {
  stripIgnoredCharacters, parse,
} = graphql
const NORMAL_CLOSURE = 1000

export default (PassThrough, WebSocket) =>
  class Client {
    // variables are initialized because they are private
    // awaiting https://github.com/evanw/esbuild/issues/47
    // to use the # notation
    ws
    operation_id = 0
    address

    /**
     * Create a graphql client
     * @param {String} address The ws connection uri.
     */
    constructor(address) {
      if (typeof address !== 'string')
        throw new TypeError(`The address must be a string`)
      this.address = address
    }

    /**
     * Connect the client to his address,
     * a client must be disconnected before connecting again
     * or it will throw an error
     */
    async connect() {
      this.ws = new WebSocket(this.address)
      await new Promise((resolve, reject) => {
        this.ws.addEventListener('open', resolve)
        this.ws.addEventListener('error', reject)
      })
      log('client ready')
    }

    disconnect() {
      if (!this.ws)
        throw new Error('You must connect before disconnecting u genius..')
      this.ws.close(NORMAL_CLOSURE, 'closed by client')
      log('disconnected')
    }

    async query(query, variables = {}) {
      if (typeof query !== 'string')
        throw new Error('The query is not a String')

      // fail fast
      parse(query)
      log('querying')

      const operation_id = this.operation_id++
      const pass_through = new PassThrough({
        objectMode: true,
      })
      const serialized_query = JSON.stringify({
        id      : operation_id,
        document: stripIgnoredCharacters(query),
        variables,
      })
      const {
        ws,
      } = this
      const message_handler = ({
        data,
      }) => {
        const operation_response = JSON.parse(data.toString())
        const {
          id, end,
        } = operation_response
        if (id !== operation_id) return
        if (end) pass_through.end()
        else pass_through.write(operation_response)
      }
      const cleanup = () => {
        ws.removeEventListener('message', message_handler)
      }

      ws.addEventListener('message', message_handler)
      pass_through.on('end', cleanup)
      pass_through.on('finish', cleanup)
      ws.send(serialized_query)

      return {
        /**
         * @return the first response then end the operation
         */
        async json() {
          for await (const result of pass_through) {
            // we force the server to not send anymore stuff
            this.end()
            return result
          }

          return undefined
        },
        /**
         * Tell the server we want to stop receiving
         * updates from this operation
         */
        end() {
          // by sending again the operation id
          // the server will end it
          ws.send(JSON.stringify({
            id: operation_id,
          }))
          pass_through.end()
          log('operation %O terminated', operation_id)
        },
        /**
         * allows for...of
         */
        async *[Symbol.asyncIterator]() {
          yield* pass_through
        },
      }
    }
  }
