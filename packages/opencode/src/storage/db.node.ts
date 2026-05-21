import { DatabaseSync } from "node:sqlite"
import { drizzle } from "drizzle-orm/node-sqlite"
import { migrate as drizzleMigrate } from "drizzle-orm/node-sqlite/migrator"

export function init(path: string) {
  const sqlite = new DatabaseSync(path)
  const db = drizzle({ client: sqlite })

  // Expose raw SQLite client for close()
  ;(db as any).$client = sqlite

  // Monkey-patch run() to handle PRAGMAs (drizzle's run expects ORM queries)
  const origRun = (db as any).run.bind(db) as Function
  ;(db as any).run = function (sql: string, ...params: any[]) {
    if (typeof sql === "string" && sql.trim().toUpperCase().startsWith("PRAGMA")) {
      sqlite.exec(sql)
      return { changes: 0, lastInsertRowid: 0 }
    }
    return origRun(sql, ...params)
  }

  return db
}

export function migrate(db: ReturnType<typeof init>, entries: { sql: string; timestamp: number; name: string }[]) {
  drizzleMigrate(db as any, entries)
}
