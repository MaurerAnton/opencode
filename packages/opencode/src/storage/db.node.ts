import Database from "better-sqlite3"
import { drizzle } from "drizzle-orm/better-sqlite3"
import { migrate as drizzleMigrate } from "drizzle-orm/better-sqlite3/migrator"

export function init(path: string) {
  const sqlite = new Database(path)
  
  // Performance pragmas
  sqlite.pragma("journal_mode = WAL")
  sqlite.pragma("synchronous = NORMAL")
  sqlite.pragma("busy_timeout = 5000")
  sqlite.pragma("cache_size = -64000")
  sqlite.pragma("foreign_keys = ON")
  
  const db = drizzle({ client: sqlite })
  
  // Expose raw client for close() and direct access
  ;(db as any).$client = sqlite
  
  return db
}

export function migrate(db: ReturnType<typeof init>, entries: { sql: string; timestamp: number; name: string }[]) {
  drizzleMigrate(db as any, entries)
}
