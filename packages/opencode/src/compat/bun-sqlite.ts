// Shim for "bun:sqlite" → node:sqlite
// Used by: editor-zed.ts, cli/cmd/db.ts
import { DatabaseSync } from "node:sqlite"

export class Database {
  private db: DatabaseSync
  filename: string

  constructor(path: string) {
    this.db = new DatabaseSync(path)
    this.filename = path
  }

  run(sql: string, ...params: any[]) {
    const stmt = this.db.prepare(sql)
    const result = stmt.run(...params)
    return {
      changes: result.changes,
      lastInsertRowid: Number(result.lastInsertRowid),
    }
  }

  all(sql: string, ...params: any[]) {
    const stmt = this.db.prepare(sql)
    return stmt.all(...params)
  }

  get(sql: string, ...params: any[]) {
    const stmt = this.db.prepare(sql)
    return stmt.get(...params)
  }

  exec(sql: string) {
    this.db.exec(sql)
  }

  prepare(sql: string) {
    const stmt = this.db.prepare(sql)
    return {
      run: (...params: any[]) => {
        const result = stmt.run(...params)
        return { changes: result.changes, lastInsertRowid: Number(result.lastInsertRowid) }
      },
      all: (...params: any[]) => stmt.all(...params),
      get: (...params: any[]) => stmt.get(...params),
      bind: (...params: any[]) => {
        stmt.bind?.(...params)
        return this
      },
    }
  }

  close() {
    this.db.close()
  }

  serialize() {
    return undefined as any
  }
}
