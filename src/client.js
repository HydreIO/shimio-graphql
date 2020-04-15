import debug from 'debug'
import Graphql from 'graphql'

const { graphql } = Graphql
const log = debug('gql-ws')

export default (ws, { headers }, { built_schema, root, context }) => {
  const log_peer = log.extend(headers['sec-websocket-key'])
  log_peer('connecting')

  ws.on('message', async message => {
    log_peer('on message %O', message.toString())
    try {
      const datas = await graphql(built_schema, message.toString(), root, context)
      ws.send(JSON.stringify(datas))
    } catch (error) {
      console.error(error)
    }
  })
}
