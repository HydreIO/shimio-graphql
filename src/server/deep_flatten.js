// // eslint-disable-next-line unicorn/new-for-builtins
// const is_primitive = value => Object(value) !== value
// // eslint-disable-next-line func-style
// function* deep_flatten(object) {
//   if (!object) return
//   for (const [key, value] of Object.entries(object)) {
//     if (is_primitive(value)) yield [key, value]
//     else if (Array.isArray(value) && is_primitive(value[0])) yield [key, value]
//     else yield* deep_flatten(value)
//   }
// }

// const merge = (key, existing_value, new_value) => {
//   if (existing_value === undefined) return { [key]: new_value }
//   const normalized_existing_value = Array.isArray(existing_value) ? existing_value : [existing_value]
//   const normalized_new_value = Array.isArray(new_value) ? new_value : [new_value]
//   return { [key]: [...normalized_existing_value, ...normalized_new_value] }
// }

// export default object => [...deep_flatten(object)].reduce((flattened, [key, value]) => {
//   const { [key]: existing_value } = flattened
//   return { ...flattened, ...merge(key, existing_value, value) }
// }, {})

const leaves = (o, parent) => {
  if (typeof o !== 'object' || o === null) return { [parent]: o }
  return Object.entries(o).map(([k, v]) => [].concat(v).map(e => leaves(e, k))).flat(Infinity)
}

export default flatten(object) {
return leaves(object).map(Object.entries).reduce((object, [[key, value]]) => {
  object[key] = key in object ? [].concat(object[key], value) : value
  return object
}, {})
}