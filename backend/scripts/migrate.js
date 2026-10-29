// Minimal migration runner: applies every migrations/*.sql in filename order,
// tracking applied files in a schema_migrations table. No framework.
import { readdirSync, readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { dirname, join } from 'node:path'
import { pool } from '../src/db.js'

const __dirname = dirname(fileURLToPath(import.meta.url))
const migrationsDir = join(__dirname, '..', 'migrations')

async function run() {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS schema_migrations (
      filename    text PRIMARY KEY,
      applied_at  timestamptz NOT NULL DEFAULT now()
    )
  `)

  const applied = new Set(
    (await pool.query('SELECT filename FROM schema_migrations')).rows.map((r) => r.filename)
  )

  const files = readdirSync(migrationsDir)
    .filter((f) => f.endsWith('.sql'))
    .sort()

  for (const file of files) {
    if (applied.has(file)) {
      console.log(`= skip ${file} (already applied)`)
      continue
    }
    const sql = readFileSync(join(migrationsDir, file), 'utf8')
    const client = await pool.connect()
    try {
      await client.query('BEGIN')
      await client.query(sql)
      await client.query('INSERT INTO schema_migrations (filename) VALUES ($1)', [file])
      await client.query('COMMIT')
      console.log(`+ applied ${file}`)
    } catch (err) {
      await client.query('ROLLBACK')
      console.error(`x failed ${file}:`, err.message)
      throw err
    } finally {
      client.release()
    }
  }
}

run()
  .then(() => {
    console.log('Migrations complete.')
    return pool.end()
  })
  .catch((err) => {
    console.error(err)
    pool.end().finally(() => process.exit(1))
  })
