import Query from '../../src/query.js'
import stream from 'stream'
import { promisify } from 'util'

const pipeline = promisify(stream.pipeline)

export default class {
  static name = 'Wuhan query'
  // static loop = 5
  static timeout = 50

  #client

  constructor() {
    this.#client = {
      open_channel: () => ({
        passthrough: source => source,
      }),
    }
  }

  static types(assert) {
    const affirm = assert(3)

    try {
      Query()
    } catch (error) {
      affirm({
        that   : 'the query',
        should : 'must have a client',
        because: error.message,
        is     : 'Missing client',
      })
    }

    const query = Query(this.#client)

    affirm({
      that   : 'the query',
      should : 'return a Generator',
      because: query('')?.constructor.name,
      is     : 'GeneratorFunction',
    })

    try {
      query()
    } catch (error) {
      affirm({
        that   : 'the query',
        should : 'must have a valid query string',
        because: error.message,
        is     : 'The query is not a String',
      })
    }
  }

  async ['passing datas'](assert) {
    const affirm = assert(3)
    const variables = { foo: [0] }
    const query = Query(this.#client)

    await pipeline(
        query('{ me { name } }', variables),
        async source => {
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
            } = JSON.parse(chunk)

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

            return
          }
        },
    )
  }
}
