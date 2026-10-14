import pg from 'pg'
import { config } from './config.js'

// Postgres `date` columns (portfolio event_date) come back as plain
// "YYYY-MM-DD" strings. The default parse to a JS Date at local midnight
// shifts the day when it's serialised as UTC, so an event on the 14th turns
// into the 13th.
pg.types.setTypeParser(1082, (v) => v)

// Managed Postgres over TLS in production. Locally (plain Postgres) SSL is off.
const isLocal = /localhost|127\.0\.0\.1/.test(config.databaseUrl)

export const pool = new pg.Pool({
  connectionString: config.databaseUrl,
  ssl: isLocal ? false : { rejectUnauthorized: false },
})

export function query(text, params) {
  return pool.query(text, params)
}

// Run a set of statements inside a single transaction. `fn` receives a client.
export async function withTransaction(fn) {
  const client = await pool.connect()
  try {
    await client.query('BEGIN')
    const result = await fn(client)
    await client.query('COMMIT')
    return result
  } catch (err) {
    await client.query('ROLLBACK')
    throw err
  } finally {
    client.release()
  }
}
