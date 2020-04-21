import { readFileSync } from 'fs'
import graphql from 'graphql'
import Koa from 'koa'
import { dirname, join } from 'path'
import { fileURLToPath } from 'url'

import server from '../../src/server'

const { buildSchema } = graphql
const directory = dirname(fileURLToPath(import.meta.url))

const app = server({
  schema: buildSchema(readFileSync(join(directory, 'schema.gql'), 'utf-8')),
  rootValue: {},
  ws_option: { perMessageDeflate: false },
  web_server: new Koa(),
})

app.use(async (context, next) => {
  console.log('coucou')
  next()
})

app.listen({ port: 1800 })
