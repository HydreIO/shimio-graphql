import Executor from '@hydre/graphql-batch-executor'
import Future from 'folktale/concurrency/future/index.js'
import object_buffer from './object_buffer.js'
import { pipeline as pipe } from 'stream'
import { promisify } from 'util'

const pipeline = promisify(pipe)
const { fromPromise } = Future
const consume_channel = execute => channel =>
  fromPromise(channel.read())
      .map(array => array.buffer)
      .map(object_buffer.rtl)
      .map(execute)
      .toPromise()

export default graphql_options => ({
  socket,
  request,
  context,
}) => {
  const {
    context: per_op_context,
    ...options
  } = graphql_options
  const executor = new Executor({
    ...options,
    context: () =>
      per_op_context({
        socket,
        request,
        context,
      }),
  })
  const consume = consume_channel(executor.execute.bind(executor))

  socket.on('channel', async channel => {
    const stream = await consume(channel)

    await pipeline(stream, async source => {
      let closing = false

      for await (const chunk of source) {
        const morphed = new Uint8Array(object_buffer.ltr(chunk))

        if (closing) continue
        if (!await channel.write(morphed)) {
          closing = true
          stream.end()
        }
      }
    })
  })
}
