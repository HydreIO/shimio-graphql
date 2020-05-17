import query from '../../src/query.js'
import stream from 'stream'
import { promisify } from 'util'
import casual from 'casual'

const pipeline = promisify(stream.pipeline)

export default class {
  static name = 'Wuhan query'
  // static loop = 5
  static timeout = 50

  static types(assert) {
    const affirm = assert(3)

    try {
      query()
    } catch (error) {
      affirm({
        that   : 'the query',
        should : 'take a string document',
        because: error.message,
        is     : 'The query is not a String',
      })
    }

    const {
      pack, unpack,
    } = query('')

    affirm({
      that   : 'the query',
      should : 'return a pack Generator',
      because: pack.constructor.name,
      is     : 'GeneratorFunction',
    })

    affirm({
      that   : 'the query',
      should : 'return an unpack AsyncGenerator',
      because: unpack.constructor.name,
      is     : 'AsyncGeneratorFunction',
    })
  }

  static async ['unpacking datas'](assert) {
    const affirm = assert(5)
    const { unpack } = query('{ me { name } }')
    const data = { foo: casual.catch_phrase }
    const errors = [{ message: casual.sentence }]

    await pipeline(
        stream
            .Readable
            .from([
              JSON.stringify({
                operation_type: 'query',
                operation_name: 'foo',
                data,
                errors,
              }),
            ]),
        unpack,
        async source => {
          for await (const chunk of source) {
            affirm({
              that   : 'unpacking',
              should : 'pass chunks through',
              because: !!chunk,
              is     : true,
            })

            const {
              operation_type,
              operation_name,
              data: received_data,
              errors: received_errors,
            } = JSON.parse(chunk.toString())

            affirm({
              that   : 'unpacking',
              should : 'correctly expose the operation_type',
              because: operation_type,
              is     : 'query',
            })

            affirm({
              that   : 'unpacking',
              should : 'correctly expose the operation_name',
              because: operation_name,
              is     : 'foo',
            })

            affirm({
              that   : 'unpacking',
              should : 'correctly expose the data',
              because: received_data,
              is     : data,
            })

            affirm({
              that   : 'unpacking',
              should : 'correctly expose any errors',
              because: received_errors,
              is     : errors,
            })

            return
          }
        },
    )
  }

  static async ['packing datas'](assert) {
    const affirm = assert(3)
    const variables = { foo: [0] }
    const { pack } = query(
        '{ me { name } }',
        variables,
    )

    await pipeline(
        pack,
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
