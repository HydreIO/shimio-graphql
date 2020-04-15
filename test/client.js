import debug from 'debug'
import WebSocket from 'ws'

const log = debug('worker').extend(`${Math.random() * 9 + 1}`[0])
const { URI = 'ws://localhost:3000/' } = process.env
const ws = new WebSocket(URI, { perMessageDeflate: false })
ws.on('open', () => {
  log('ping')
  ws.send('{ ping }')
})

ws.on('message', data => {
  log.extend('<-')(data.toString())
})
