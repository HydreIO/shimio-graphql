import bench from 'benchmark'
import topo from '../src/server/topological_matrix.js'

const suite = new bench.Suite

const licorne = ({
  values,
  has_deps,
  depends_on,
}) => {
  const result = [values.filter(v => !has_deps(v))]
  for (; ;) {
    const layer = []
    for (const node of result[result.length - 1])
      layer.push(...values.filter(v => depends_on(v, node)))
    if (layer.length)
      result.push(layer)
    else break
  }
  return result
}

const values = [
  {
    give: 5,
    need: 2,
  },
  {
    give: 3,
    need: 2,
  },
  {
    give: 2,
    need: 4,
  },
  {
    give: 6,
  },
  {
    give: 5,
  },
]

console.log(topo({
  values,
  depends_on(value, second_value) {
    return value.need === second_value.give
  },
}))

// suite
//     .add('David', () => {
//       licorne({
//         values,
//         has_deps: v => v.need !== undefined,
//         depends_on(value, second_value) {
//           return value.need === second_value.give
//         },
//       })
//     })
//     .add('Sceat', () => {
//       topo({
//         values,
//         depends_on(value, second_value) {
//           return value.need === second_value.give
//         },
//       })
//     })
//     .on('cycle', event => {
//       console.log(String(event.target))
//     })
//     .on('complete', function() {
//       console.log('Fastest is ' + this.filter('fastest').map('name'))
//     })
//     .run({
//       'async': true,
//     })
