import doubt from '@hydre/doubt'
import reporter from 'tap-spec-emoji'
import QuerySuite from './suites/query.test.js'
import { pipeline } from 'stream'
;(async () => {
  pipeline(
      await doubt(QuerySuite),
      reporter(),
      process.stdout,
      error => {
        if (error) console.error(error)
      },
  )
})()
