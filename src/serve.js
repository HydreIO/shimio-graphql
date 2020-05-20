import Executor from '@hydre/graphql-batch-executor'
import Future from 'folktale/concurrency/future/index.js'
import object_buffer from './object_buffer.js'
import { pipeline } from 'stream'

const { fromPromise } = Future
const consume_channel = executor => channel =>
  fromPromise(channel.read())
      .map(array => array.buffer)
      .map(object_buffer.rtl)
      .map(executor.execute.bind(executor))
      .toPromise()

export default graphql_options => async ({ ws }, next) => {
  const consume = consume_channel(new Executor(graphql_options))

  ws.on('channel', async channel => {
    pipeline(
        await consume(channel),
        async function *(source) {
          for await (const chunk of source)
            yield new Uint8Array(object_buffer.ltr(chunk))
        },
        channel.writable.bind(channel),
        error => {
          if (error) console.error(error)
        },
    )
  })
  await next()
}
