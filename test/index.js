import doubt from '@hydre/doubt'
import reporter from 'tap-spec-emoji'
import QuerySuite from './suites/query.test.js'
import IsoSuite from './suites/object_buffer.test.js'
import { pipeline } from 'stream'
import ws from 'ws'

// this should be allowed but it is a recent feature
// will see to bump the lint config
// eslint-disable-next-line no-undef
globalThis.WebSocket = ws

const { default: ServeSuite } = await import('./suites/serve.test.js')

pipeline(
    await doubt(QuerySuite, IsoSuite, ServeSuite),
    reporter(),
    process.stdout,
    error => {
      if (error) console.error(error)
    },
)
