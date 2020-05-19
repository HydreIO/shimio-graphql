import Result from 'folktale/result/index.js'
import curry from 'folktale/core/lambda/curry.js'

const to_code = char => char.charCodeAt(0)
const from_char_code = curry(
    3,
    Reflect.apply,
)(String.fromCharCode)
const Iso = (ltr, rtl) => ({
  ltr,
  rtl,
})

export default Iso(
    object =>
      Result.try(() => JSON.stringify(object))
          .map(string => [...string])
          .map(chars => chars.map(to_code))
          .map(x => Uint16Array.from(x))
          .map(array => array.buffer)
          .getOrElse(new ArrayBuffer(0)),
    buffer =>
      Result.of(buffer)
          .map(x => new Uint16Array(x))
          .map(from_char_code(undefined))
          .chain(string => Result.try(() => JSON.parse(string)))
          .getOrElse({}),
)
