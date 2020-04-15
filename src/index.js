import Graphql from 'graphql'
import zmq from 'jszmq'

const { graphql, buildSchema } = Graphql

export default ({ schema, root, context = async () => ({}) }) => {
  if (typeof schema !== 'string') throw new Error('The schema is either undefined or invalid')
  if (typeof root !== 'object') throw new Error('The root resolver is not an object')
  if (context?.constructor?.name !== 'AsyncFunction') throw new Error('The context must be an async functon')
  const reply_socket = new zmq.Rep()
  const built_schema = buildSchema(schema)
  return uri => {
    reply_socket.bind(uri)
    reply_socket.on('message', async message => {
      try {
        const datas = await graphql(built_schema, message.toString(), root)
        reply_socket.send(JSON.stringify(datas))
      } catch (error) {
        console.error(error)
      }
    })
  }
}
