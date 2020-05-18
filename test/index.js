import doubt from '@hydre/doubt'
import reporter from 'tap-spec-emoji'
import QuerySuite from './suites/query.test.js'
import IsoSuite from './suites/isomorph.test.js'
import { pipeline } from 'stream'

const main = async () => {
  pipeline(
      await doubt(
          QuerySuite,
          IsoSuite,
      ),
      reporter(),
      process.stdout,
      error => {
        if (error) console.error(error)
      },
  )
}

main()
