/**
 *
 * @param {Array|AsyncIterator} array the array or async iterator to reduce
 * @return an async reducer following the same spec as a vanilla reducer
 */
export default array => async (async_callback, initial_value) => {
  let result = initial_value
  let index = 0
  for await (const datas of array)
    result = await async_callback(result, datas, index++, array)
  return result
}
