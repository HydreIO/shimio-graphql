export {
  default as Client,
} from './client.js'
export {
  default as Server,
} from './server.js'

/**
 * small utility to consume a query response and
 * return a promise of the json result
 * @param {Promise} query - response
 * ```js
 * const data = await query().then(json)
 * ```
 */
export const json = query_response => query_response.json()
