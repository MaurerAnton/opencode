// Runtime detection and compatibility shims
// Provides drop-in replacements for Bun APIs on Node.js

import { readFileSync, existsSync } from "node:fs"
import { spawnSync, ChildProcess, spawn as nodeSpawn } from "node:child_process"
import { tmpdir } from "node:os"
import { join } from "node:path"

export const isBun = typeof Bun !== "undefined"

// --- Bun.file() → Node compat ---
export function file(p: string) {
  if (isBun) return Bun.file(p)
  if (!existsSync(p)) throw new Error(`File not found: ${p}`)
  const content = readFileSync(p)
  return {
    text: () => Buffer.from(content).toString("utf-8"),
    json: () => JSON.parse(Buffer.from(content).toString("utf-8")),
    bytes: () => Uint8Array.from(content),
    arrayBuffer: () => content.buffer.slice(content.byteOffset, content.byteOffset + content.byteLength),
    exists: true,
    size: content.length,
  }
}

// --- Bun.spawn → Node compat ---
export function spawn(command: string[], options?: any): SpawnResult {
  if (isBun) return Bun.spawn({ cmd: command, ...options }) as any
  const child = nodeSpawn(command[0], command.slice(1), {
    stdio: options?.stdout === "pipe" ? "pipe" : "inherit",
    ...options,
  })
  return {
    stdout: child.stdout,
    stderr: child.stderr,
    get exitCode() { return child.exitCode },
    get exited() { return new Promise<number>((r) => child.on("close", (c) => r(c ?? 0))) },
    kill() { child.kill() },
  } as any
}

// --- Bun.$ shell → Node compat ---
export interface ShellResult { exitCode: number; stdout: string; stderr: string }
export function $(
  strings: TemplateStringsArray | string[],
  ...values: any[]
): { quiet(): Promise<ShellResult> } & Promise<ShellResult> {
  if (isBun) {
    const b = Bun.$
    if (Array.isArray(strings)) return b(strings) as any
    return (b as any)(strings, ...values)
  }
  let cmd: string
  if (Array.isArray(strings)) {
    cmd = strings.join(" ")
  } else {
    cmd = strings.reduce((acc, p, i) => acc + p + (values[i] ?? ""), "")
  }
  const r = spawnSync(cmd, { encoding: "utf-8", shell: true })
  const result: ShellResult = { exitCode: r.status ?? 0, stdout: r.stdout ?? "", stderr: r.stderr ?? "" }
  const p: any = Promise.resolve(result)
  p.quiet = () => Promise.resolve(result)
  return p
}

// --- Bun.which → Node compat ---
export function which(name: string): string | null {
  if (isBun) return Bun.which(name)
  const r = spawnSync("which", [name], { encoding: "utf-8" })
  return r.status === 0 ? (r.stdout || "").trim() || null : null
}

// --- Bun.stringWidth → Node compat ---
export function stringWidth(s: string): number {
  if (isBun) return Bun.stringWidth(s)
  // Rough estimate: consider CJK chars as width 2
  let w = 0
  for (const c of s) {
    const cp = c.codePointAt(0) ?? 0
    w += (cp >= 0x1100 && cp <= 0x115f) || (cp >= 0x2329 && cp <= 0x232a) ||
         (cp >= 0x2e80 && cp <= 0xa4cf) || (cp >= 0xac00 && cp <= 0xd7a3) ||
         (cp >= 0xf900 && cp <= 0xfaff) || (cp >= 0xfe10 && cp <= 0xfe19) ||
         (cp >= 0xfe30 && cp <= 0xfe6f) || (cp >= 0xff01 && cp <= 0xff60) ||
         (cp >= 0xffe0 && cp <= 0xffe6) || (cp >= 0x1f300 && cp <= 0x1f64f) ||
         (cp >= 0x1f900 && cp <= 0x1f9ff) || (cp >= 0x20000 && cp <= 0x2fffd) ||
         (cp >= 0x30000 && cp <= 0x3fffd) ? 2 : 1
  }
  return w
}

// --- Bun.stdin.text → Node compat ---
export function stdinText(): Promise<string | undefined> {
  if (isBun) {
    if (!process.stdin.isTTY) return Bun.stdin.text()
    return Promise.resolve(undefined)
  }
  if (process.stdin.isTTY) return Promise.resolve(undefined)
  return new Promise((resolve) => {
    let data = ""
    process.stdin.setEncoding("utf-8")
    process.stdin.on("data", (chunk) => { data += chunk })
    process.stdin.on("end", () => resolve(data || undefined))
    process.stdin.on("error", () => resolve(undefined))
  })
}

// --- Fetch/Response specific compat ---
export function fileToResponse(p: string): Response | null {
  if (isBun) return new Response(Bun.file(p)) as any
  try {
    const buf = readFileSync(p)
    return new Response(buf)
  } catch { return null }
}
