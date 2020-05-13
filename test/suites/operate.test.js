import operate from '../../src/operate.js'
import { CallTracker } from 'assert'
import stream from 'stream'
import { promisify } from 'util'
import casual from 'casual'

export default class {
  static name = 'Wuhan operate'
  static loop = 1
  static timeout = 50

  #tracker = new CallTracker()

  constructor(cleanup) {
    cleanup(() => {
      this.#tracker.verify()
    })
  }

  options(assert) {
    const affirm = this.#tracker.calls(assert, 1)

    try {
      operate()
    } catch (error) {
      affirm({
        that   : 'the schema',
        should : 'be defined',
        because: error.message,
        is     : 'Missing or invalid schema',
      })
    }
  }
}
