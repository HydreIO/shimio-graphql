import object_buffer from '../../src/object_buffer.js'

export default class {
  static name = 'isomorphing'

  static ['object buffer morphing'](affirmation) {
    const affirm = affirmation(3)
    const ltr = object_buffer.ltr({})
    const rtl = object_buffer.rtl(new ArrayBuffer(0))
    const round_trip
      = object_buffer.rtl(object_buffer.ltr({ foo: 'bar' }))

    affirm({
      that   : 'ltr',
      should : 'morph an object into a arraybuffer',
      because: ltr instanceof ArrayBuffer,
      is     : true,
    })

    affirm({
      that   : 'rtl',
      should : 'morph an arraybuffer into an object',
      because: rtl,
      is     : {},
    })

    affirm({
      that   : 'object_buffer',
      should : 'is a valid isomoprh',
      because: round_trip,
      is     : { foo: 'bar' },
    })
  }
}
