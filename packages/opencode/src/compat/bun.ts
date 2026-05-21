// Bun → Node.js compatibility layer
// Drop-in replacements for Bun APIs used in opencode source

import { readFileSync, existsSync } from "node:fs"
import { spawn as nodeSpawn, spawnSync, ChildProcess } from "node:child_process"
import { join } from "node:path"
import { tmpdir } from "node:os"

// --- Bun.file() replacement ---
export function file(path: string) {
  if (!existsSync(path)) throw new Error(`File not found: ${path}`)
  const content = readFileSync(path)
  return {
    text: () => Buffer.from(content).toString("utf-8"),
    json: () => JSON.parse(Buffer.from(content).toString("utf-8")),
    bytes: () => Uint8Array.from(content),
    arrayBuffer: () => content.buffer.slice(content.byteOffset, content.byteOffset + content.byteLength),
    exists: true,
    size: content.length,
  }
}

// --- Bun.$ shell ---
export async function $(strings: TemplateStringsArray, ...values: any[]): Promise<ShellResult>
export async function $(command: string[]): Promise<ShellResult>

// We implement a minimal shell runner
export function $(cmd: TemplateStringsArray | string[], ...values: any[]): { quiet(): Promise<ShellResult> } & Promise<ShellResult> {
  let commandStr: string
  if (Array.isArray(cmd)) {
    // Bare array: $(["ls", "-la"])
    const args = cmd.slice(1)
    const result = spawnSync(cmd[0], args, { encoding: "utf-8" })
    const p: any = Promise.resolve({ exitCode: result.status ?? 0, stdout: result.stdout, stderr: result.stderr })
    p.quiet = () => Promise.resolve({ exitCode: result.status ?? 0, stdout: result.stdout, stderr: result.stderr })
    return p
  }
  // Template literal: $`git status`
  commandStr = cmd.reduce((acc, part, i) => acc + part + (values[i] ?? ""), "")
  const result = spawnSync(commandStr, { encoding: "utf-8", shell: true })
  const p: any = Promise.resolve({ exitCode: result.status ?? 0, stdout: result.stdout, stderr: result.stderr })
  p.quiet = () => Promise.resolve({ exitCode: result.status ?? 0, stdout: result.stdout, stderr: result.stderr })
  return p
}

// --- Bun.spawn replacement ---
export function spawn(command: string[], options?: any): Process {
  const child = nodeSpawn(command[0], command.slice(1), {
    stdio: options?.stdout === "pipe" ? "pipe" : "inherit",
    ...options,
  })
  return new Process(child)
}

class Process {
  child: ChildProcess
  constructor(child: ChildProcess) {
    this.child = child
  }
  get stdout() { return this.child.stdout! }
  get stderr() { return this.child.stderr! }
  get exitCode() { return this.child.exitCode }
  get exited(): Promise<number> {
    return new Promise((resolve) => {
      this.child.on("close", (code) => resolve(code ?? 0))
    })
  }
  kill() { this.child.kill() }
}

// --- Bun.which replacement ---
export function which(name: string): string | null {
  const result = spawnSync("which", [name], { encoding: "utf-8" })
  if (result.status !== 0) return null
  return (result.stdout || "").trim() || null
}

// --- Utility replacements ---
export const tmpdir_ = tmpdir

interface ShellResult {
  exitCode: number
  stdout: string
  stderr: string
}
