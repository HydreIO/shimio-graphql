// Provide a topological sort with a 2-dimensional array
// given the input:

// topological_matrix({
//   values: [
//     {
//       give: 5,
//       need: 2,
//     },
//     {
//       give: 3,
//       need: 2,
//     },
//     {
//       give: 2,
//       need: 4,
//     },
//     {
//       give: 4,
//     },
//   ],
//   depends_on(value, second_value) {
//     return value.need === second_value.give
//   },
// })

// we get
// [
//   [ { give: 4 } ],
//   [ { give: 2, need: 4 } ],
//   [ { give: 5, need: 2 }, { give: 3, need: 2 } ]
// ]
//
// TODO: detect when a value need something that isn't exported
// currently is only verified by the graphql validation
export default ({
  values,
  depends_on,
}) => {
  const visited = new WeakSet()
  const result = []

  const find_layer = value => {
    const index = result.findIndex(
        layer_values => layer_values.some(
            layer_value => depends_on(value, layer_value),
        ),
    )
    return index + 1
  }

  const visitor = () => {
    const recurse = new WeakSet()
    const visit = visited_value => {
      if (recurse.has(visited_value)) throw visited_value
      if (visited.has(visited_value)) return
      recurse.add(visited_value)
      visited.add(visited_value)
      values
          .filter(value => depends_on(visited_value, value))
          .forEach(visit)
      const layer = find_layer(visited_value)
      if (!result[layer]) result[layer] = []
      result[layer].push(visited_value)
    }
    return visit
  }

  values.forEach(value => visitor()(value))
  return result
}
