import Query from '../../src/query.js'
import stream from 'stream'
import { promisify } from 'util'

const pipeline = promisify(stream.pipeline)

export default class {
  static name = 'Wuhan query'
  // static loop = 5
  static timeout = 50

  #client

  constructor(cleanup) {
    let connected = false

    cleanup(() => {
      this.#client.disconnect()
    })

    this.#client = {
      get connected() {
        return connected
      },
      connect: async () => {
        connected = true
      },
      disconnect: () => {
        connected = false
      },
      open_channel: () => ({
        passthrough: source => source,
        close      : () => {},
      }),
    }
  }

  static async types(assert) {
    const affirm = assert(4)

    try {
      Query()
    } catch (error) {
      affirm({
        that   : 'the query',
        should : 'have a client',
        because: error.message,
        is     : 'Missing client',
      })
    }

    try {
      Query(this.#client)('')
    } catch (error) {
      affirm({
        that   : 'querying before connection',
        should : 'throw an error',
        because: error.message,
        is     : 'The client is not connected',
      })
    }

    await this.#client.connect()

    const { listen, stop } = Query(this.#client)('')

    affirm({
      that   : 'the query',
      should : 'return a valid object',
      because: !!(listen && stop),
      is     : true,
    })

    try {
      Query(this.#client)()
    } catch (error) {
      affirm({
        that   : 'the query',
        should : 'have a valid query string',
        because: error.message,
        is     : 'The query is not a String',
      })
    }
  }

  async ['passing datas'](assert) {
    const affirm = assert(3)
    const variables = { foo: [0] }
    const query = Query(this.#client)

    await this.#client.connect()

    const { listen, stop } = query(
        '{ me { name } }',
        variables,
    )

    await pipeline(listen, async source => {
      for await (const chunk of source) {
        affirm({
          that   : 'packing',
          should : 'pass chunks through',
          because: !!chunk,
          is     : true,
        })

        const {
          document,
          variables: packed_variables,
        } = chunk

        affirm({
          that   : 'packing',
          should : 'minify the document',
          because: document,
          is     : '{me{name}}',
        })

        affirm({
          that   : 'packing',
          should : 'pass the variables if any',
          because: packed_variables,
          is     : variables,
        })
        stop()
        await new Promise(resolve =>
          setTimeout(resolve, 10))
        return
      }
    })
  }
}
