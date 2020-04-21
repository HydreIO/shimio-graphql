import debug from 'debug'

const log = debug('client').extend(`${Math.random() * 9 + 1}`[0])
const { URI = 'ws://localhost:3000/' } = process.env
