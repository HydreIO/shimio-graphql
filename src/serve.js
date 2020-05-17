import { pipeline } from 'stream'
import Executor from '@hydre/graphql-batch-executor'
import Task from 'folktale/concurrency/task/index.js'
import Result from 'folktale/result/index.js'

const { task } = Task
const bytes_to_string = bytes => {
  const chars = []

  for (let i = 0, n = bytes.length; i < n;)
    chars.push((bytes[i++] & 0xFF) << 8 | bytes[i++] & 0xFF)

  return String.fromCharCode.apply(
      undefined,
      chars,
  )
}
const string_to_bytes = string => {
  const bytes = []

  for (let i = 0, n = string.length; i < n; i++) {
    const char = string.charCodeAt(i)

    bytes.push(
        char >>> 8,
        char & 0xFF,
    )
  }

  return bytes
}
const consume_channel
  = execute => channel => task(resolver => {
    channel.read().then(resolver.resolve)
  })
      .run()
      .future()
      .map(bytes_to_string)
      .chain(string => Result.try(JSON.parse(string)))
      .map(execute)
      .chain(readable => task(resolver => {
        pipeline(
            readable,
            async function *(source) {
              for await (const chunk of source)
                yield string_to_bytes(JSON.stringify(chunk))
            },
            channel.writable.bind(channel),
            error => error ? resolver.reject(error) : resolver.resolve(),
        )
      })
          .run()
          .future())
      .listen({
        onRejected: reason => console.error(reason),
        onResolved: () => {
          channel.close()
        },
      })

export default graphql_options => {
  const executor = new Executor(graphql_options)

  return async ({
    ws,
    next,
  }) => {
    ws.on(
        'channel',
        consume_channel(executor.execute.bind(executor)),
    )
    await next()
  }
}
