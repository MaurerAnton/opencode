#!/usr/bin/env bun

import { $ } from "bun"
import fs from "fs"
import path from "path"
import { fileURLToPath } from "url"
import { createSolidTransformPlugin } from "@opentui/solid/bun-plugin"

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)
const dir = path.resolve(__dirname, "..")

process.chdir(dir)

const generated = await import("./generate.ts")

import { Script } from "@opencode-ai/script"
import pkg from "../package.json"

// Load migrations from migration directories
const migrationDirs = (
  await fs.promises.readdir(path.join(dir, "migration"), {
    withFileTypes: true,
  })
)
  .filter((entry) => entry.isDirectory() && /^\d{4}\d{2}\d{2}\d{2}\d{2}\d{2}/.test(entry.name))
  .map((entry) => entry.name)
  .sort()

const migrations = await Promise.all(
  migrationDirs.map(async (name) => {
    const file = path.join(dir, "migration", name, "migration.sql")
    const sql = await Bun.file(file).text()
    const match = /^(\d{4})(\d{2})(\d{2})(\d{2})(\d{2})(\d{2})/.exec(name)
    const timestamp = match
      ? Date.UTC(
          Number(match[1]),
          Number(match[2]) - 1,
          Number(match[3]),
          Number(match[4]),
          Number(match[5]),
          Number(match[6]),
        )
      : 0
    return { sql, timestamp, name }
  }),
)
console.log(`Loaded ${migrations.length} migrations`)

const singleFlag = process.argv.includes("--single")
const baselineFlag = process.argv.includes("--baseline")
const skipInstall = process.argv.includes("--skip-install")
const sourcemapsFlag = process.argv.includes("--sourcemaps")
const plugin = createSolidTransformPlugin()
const skipEmbedWebUi = process.argv.includes("--skip-embed-web-ui")

const createEmbeddedWebUIBundle = async () => {
  console.log(`Building Web UI to embed in the binary`)
  const appDir = path.join(import.meta.dirname, "../../app")
  const dist = path.join(appDir, "dist")
  await $`bun run --cwd ${appDir} build`
  const files = (await Array.fromAsync(new Bun.Glob("**/*").scan({ cwd: dist })))
    .map((file) => file.replaceAll("\\", "/"))
    .filter((file) => !file.endsWith(".map"))
    .sort()
  const imports = files.map((file, i) => {
    const spec = path.relative(dir, path.join(dist, file)).replaceAll("\\", "/")
    return `import file_${i} from ${JSON.stringify(spec.startsWith(".") ? spec : `./${spec}`)} with { type: "file" };`
  })
  const entries = files.map((file, i) => `  ${JSON.stringify(file)}: file_${i},`)
  return [
    `// Import all files as file_$i with type: "file"`,
    ...imports,
    `// Export with original mappings`,
    `export default {`,
    ...entries,
    `}`,
  ].join("\n")
}

const embeddedFileMap = skipEmbedWebUi ? null : await createEmbeddedWebUIBundle()

// 3 CPU targets supported by Bun:
//   arm64         — ARM v8.0+, NEON always
//   x64           — x86_64, AVX2 (Haswell 2013+)
//   x64-baseline  — x86_64, SSE4.2 only (Nehalem 2008+), no AVX2
type Cpu = "arm64" | "x64" | "x64-baseline"
type Variant = "hard" | "soft"

const allTargets: {
  os: "linux"
  cpu: Cpu
  abi?: "musl"
  variant: Variant
}[] = [
  // arm64 × glibc
  { os: "linux", cpu: "arm64", variant: "hard" },
  { os: "linux", cpu: "arm64", variant: "soft" },
  // arm64 × musl
  { os: "linux", cpu: "arm64", abi: "musl", variant: "hard" },
  { os: "linux", cpu: "arm64", abi: "musl", variant: "soft" },
  // x64 (AVX2) × glibc
  { os: "linux", cpu: "x64", variant: "hard" },
  { os: "linux", cpu: "x64", variant: "soft" },
  // x64 (AVX2) × musl
  { os: "linux", cpu: "x64", abi: "musl", variant: "hard" },
  { os: "linux", cpu: "x64", abi: "musl", variant: "soft" },
  // x64-baseline (SSE4.2) × glibc
  { os: "linux", cpu: "x64-baseline", variant: "hard" },
  { os: "linux", cpu: "x64-baseline", variant: "soft" },
  // x64-baseline (SSE4.2) × musl
  { os: "linux", cpu: "x64-baseline", abi: "musl", variant: "hard" },
  { os: "linux", cpu: "x64-baseline", abi: "musl", variant: "soft" },
]

const targets = singleFlag
  ? allTargets.filter((item) => {
      const currentCpu: Cpu = process.arch === "arm64" ? "arm64" : baselineFlag ? "x64-baseline" : "x64"
      return item.cpu === currentCpu && item.abi === undefined && item.variant === "hard"
    })
  : allTargets

await $`rm -rf dist`

const binaries: Record<string, string> = {}
if (!skipInstall) {
  await $`bun install --os="*" --cpu="*" @opentui/core@${pkg.dependencies["@opentui/core"]}`
  await $`bun install --os="*" --cpu="*" @parcel/watcher@${pkg.dependencies["@parcel/watcher"]}`
}
for (const item of targets) {
  // cpu: "arm64" | "x64" | "x64-baseline" → arch: "arm64" | "x64", baseline: true/false
  const baseline = item.cpu === "x64-baseline"
  const arch = baseline ? "x64" : item.cpu

  const name = [
    pkg.name,
    "linux",
    item.cpu,
    item.abi,
    item.variant,
  ]
    .filter(Boolean)
    .join("-")
  console.log(`building ${name}`)
  await $`mkdir -p dist/${name}/bin`

  const localPath = path.resolve(dir, "node_modules/@opentui/core/parser.worker.js")
  const rootPath = path.resolve(dir, "../../node_modules/@opentui/core/parser.worker.js")
  const parserWorker = fs.realpathSync(fs.existsSync(localPath) ? localPath : rootPath)
  const workerPath = "./src/cli/cmd/tui/worker.ts"

  const bunfsRoot = "/$bunfs/root/"
  const workerRelativePath = path.relative(dir, parserWorker).replaceAll("\\", "/")

  // Bun compile target: bun-linux-{arch}[-baseline][-musl]
  const bunTarget = [
    "bun",
    item.os,
    arch,
    baseline ? "baseline" : undefined,
    item.abi,
  ]
    .filter(Boolean)
    .join("-")

  await Bun.build({
    conditions: ["browser"],
    tsconfig: "./tsconfig.json",
    plugins: [plugin],
    external: ["node-gyp"],
    format: "esm",
    minify: item.variant === "hard",
    sourcemap: sourcemapsFlag ? "linked" : "none",
    splitting: true,
    compile: {
      autoloadBunfig: false,
      autoloadDotenv: false,
      autoloadTsconfig: true,
      autoloadPackageJson: true,
      target: bunTarget as any,
      outfile: `dist/${name}/bin/opencode`,
      execArgv: [`--user-agent=opencode/${Script.version}`, "--use-system-ca", "--"],
      windows: {},
    },
    files: embeddedFileMap ? { "opencode-web-ui.gen.ts": embeddedFileMap } : {},
    entrypoints: ["./src/index.ts", parserWorker, workerPath, ...(embeddedFileMap ? ["opencode-web-ui.gen.ts"] : [])],
    define: {
      OPENCODE_VERSION: `'${Script.version}'`,
      OPENCODE_MIGRATIONS: JSON.stringify(migrations),
      OPENCODE_MODELS_DEV: generated.modelsData,
      OTUI_TREE_SITTER_WORKER_PATH: bunfsRoot + workerRelativePath,
      OPENCODE_WORKER_PATH: workerPath,
      OPENCODE_CHANNEL: `'${Script.channel}'`,
      OPENCODE_LIBC: `'${item.abi ?? "glibc"}'`,
      OPENCODE_VARIANT: `'${item.variant}'`,
      OPENCODE_CPU: `'${item.cpu}'`,
    },
  })

  // Smoke test: only run if binary is for current platform
  if (arch === process.arch && !item.abi) {
    const binaryPath = `dist/${name}/bin/opencode`
    console.log(`Running smoke test: ${binaryPath} --version`)
    try {
      const versionOutput = await $`${binaryPath} --version`.text()
      console.log(`Smoke test passed: ${versionOutput.trim()}`)
    } catch (e) {
      console.error(`Smoke test failed for ${name}:`, e)
      process.exit(1)
    }
  }

  await $`rm -rf ./dist/${name}/bin/tui`
  await Bun.file(`dist/${name}/package.json`).write(
    JSON.stringify(
      {
        name,
        version: Script.version,
        preferUnplugged: true,
        os: ["linux"],
        cpu: [arch],
        libc: [item.abi ?? "glibc"],
        variant: item.variant,
        baseline,
      },
      null,
      2,
    ),
  )
  binaries[name] = Script.version
}

if (Script.release) {
  for (const key of Object.keys(binaries)) {
    await $`tar -czf ../../${key}.tar.gz *`.cwd(`dist/${key}/bin`)
  }
  const archives = (await Array.fromAsync(new Bun.Glob("*.tar.gz").scan({ cwd: "dist" })))
    .map((f) => `./dist/${f}`)
  if (archives.length > 0) {
    await $`sha256sum ./dist/*.tar.gz > ./dist/SHA256SUMS`
    const gpgKey = process.env.GPG_PRIVATE_KEY
    const gpgPass = process.env.GPG_PASSPHRASE
    if (gpgKey) {
      console.log("Signing SHA256SUMS with GPG...")
      const gpgArgs = gpgPass
        ? ["--batch", "--passphrase", gpgPass, "--pinentry-mode", "loopback"]
        : ["--batch", "--no-tty"]
      await $`gpg --import --batch <(echo "$GPG_PRIVATE_KEY")`.env({ GPG_PRIVATE_KEY: gpgKey }).nothrow()
      await $`gpg ${{ raw: gpgArgs.join(" ") }} --detach-sign --armor ./dist/SHA256SUMS`
      await $`gh release upload v${Script.version} ./dist/SHA256SUMS.asc ${archives} ./dist/SHA256SUMS --clobber --repo ${process.env.GH_REPO}`
    } else {
      await $`gh release upload v${Script.version} ./dist/SHA256SUMS ${archives} --clobber --repo ${process.env.GH_REPO}`
    }
  }
}

export { binaries }
