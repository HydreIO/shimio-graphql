import graphql from 'graphql'

const { stripIgnoredCharacters } = graphql

export default client => (query, variables = {}) => {
  if (typeof query !== 'string') throw new Error('The query is not a String')
  return client
      .open_channel()
      .passthrough(function *() {
        yield JSON.stringify({
          document: stripIgnoredCharacters(query),
          variables,
        })
      })
}
