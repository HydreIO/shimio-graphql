import graphql from 'graphql'

const { stripIgnoredCharacters } = graphql

export default (query, variables = {}) => {
  if (typeof query !== 'string')
    throw new Error('The query is not a String')

  const serialized_query = JSON.stringify({
    document: stripIgnoredCharacters(query),
    variables,
  })

  return {
    *pack() {
      yield serialized_query
    },
    async *unpack(source) {
      yield* source
    },
  }
}
