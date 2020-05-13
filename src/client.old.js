import debug from 'debug'
import graphql from 'graphql'
import event_iterator from 'event-iterator'

const log = debug('gql-ws').extend('client')
const { stripIgnoredCharacters } = graphql
const { EventIterator } = event_iterator
const NORMAL_CLOSURE = 1000

export default (
    // eslint-disable-next-line no-use-before-define
    WebSocket = WebSocket,
    // eslint-disable-next-line no-use-before-define
    EventTarget = EventTarget,
    // eslint-disable-next-line no-use-before-define
    Event = Event,
) =>
  class Client {
    #ws
    #address
    #emitter = new EventTarget()
    #operation_id = 0

    /**
     * Create a graphql client
     * @param {String} address The ws connection uri.
     */
    constructor(address) {
      if (typeof address !== 'string')
        throw new TypeError('The address must be a string')
      this.#address = address
    }

    /**
     * Connect the client to his address,
     * a client must be disconnected before connecting again
     * or it will throw an error
     */
    async connect() {
      if (this.#ws) throw new Error('You are already connected genius..')
      this.#ws = new WebSocket(this.#address)
      this.#ws.addEventListener('message', ({ data }) => {
        const {
          id, ...rest
        } = JSON.parse(data.toString())
        const event = new Event(`${ id }`, rest)

        this.#emitter.dispatchEvent(event)
      })
      await new Promise((resolve, reject) => {
        this.#ws.addEventListener('open', resolve)
        this.#ws.addEventListener('error', reject)
      })
      log('client ready')
    }

    disconnect() {
      if (!this.#ws)
        throw new Error('You must connect before disconnecting u idiot..')
      this.#ws.close(NORMAL_CLOSURE, 'closed by client')
      this.#ws = undefined
      log('disconnected')
    }

    async query(query, variables = {}) {
      if (typeof query !== 'string')
        throw new Error('The query is not a String')
      if (!this.#ws) throw new Error('The client is not connected')

      log('querying')

      const operation_id = this.#operation_id++
      const serialized_query = JSON.stringify({
        id      : operation_id,
        document: stripIgnoredCharacters(query),
        variables,
      })
      const ws = this.#ws
      const emitter = this.#emitter
      const iterator = new EventIterator(({
        push, stop,
      }) => {
        iterator.prototype.end = stop

        const event = `${ operation_id }`
        const listener = ({
          end, ...rest
        }) => {
          if (end) stop()
          else push(rest)
        }

        emitter.addEventListener(event, listener)
        return () => {
          emitter.removeEventListener(event, listener)
        }
      })

      ws.send(serialized_query)

      return {
        /**
         * @return the first response then end the operation
         */
        async json() {
          for await (const result of iterator) {
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
          ws.send(JSON.stringify({ id: operation_id }))
          iterator.end()
          log('operation %O terminated', operation_id)
        },
        /**
         * allows for...of
         */
        [Symbol.asyncIterator]() {
          return iterator
        },
      }
    }
  }
