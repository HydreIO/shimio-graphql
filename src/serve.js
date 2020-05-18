import Executor from '@hydre/graphql-batch-executor'
import Future from 'folktale/concurrency/future/index.js'
import Maybe from 'folktale/maybe/index.js'
import Task from 'folktale/concurrency/task/index.js'
import object_buffer from './object_buffer.js'
import { pipeline } from 'stream'

const handle_failure = {
  // onCancelled: () => 'task was cancelled',
  onRejected:  error => console.error('unable to write to channel', error),
  onResolved:  _ => console.log('all fine!', _),
}
const { fromPromise } = Future
const { task } = Task
const query_to_stream = execute => query => Maybe
    .of(query)
    .chain(object_buffer.rtl)
    .map(execute)
    .getOrElse(undefined)
const write_all = channel => stream => task(resolver => {
  pipeline(
      stream,
      async function *(source) {
        for await (const chunk of source)
          yield object_buffer.ltr(chunk)
      },
      channel.writable.bind(channel),
      error => error ? resolver.reject(error) : resolver.resolve(),
  )
})
const consume_channel = executor => channel => fromPromise(channel.read())
    .map(query_to_stream(executor.execute.bind(executor)))
    .map(readable => Maybe
        .of(readable)
        .chain(write_all(channel))
        .run()
        .listen(handle_failure))

export default graphql_options => async ({ ws, next }) => {
  ws.on('channel', consume_channel(new Executor(graphql_options)))
  await next()
}

