import { Effect, Schema } from "effect"
import * as Tool from "./tool"
import { $ } from "bun"
import { readFile, unlink } from "fs/promises"
import { tmpdir } from "os"
import { join } from "path"

const DESCRIPTION = await Bun.file(new URL("./browser.txt", import.meta.url)).text()

export const Parameters = Schema.Struct({
  url: Schema.String.annotate({ description: "The URL to take a screenshot of" }),
  width: Schema.optional(Schema.Number).annotate({
    description: "Viewport width in pixels (default 1280)",
  }),
  height: Schema.optional(Schema.Number).annotate({
    description: "Viewport height in pixels (default 720)",
  }),
})

const BROWSER_CANDIDATES = [
  "chromium",
  "google-chrome",
  "google-chrome-stable",
  "chromium-browser",
  "firefox",
]

async function findBrowser(): Promise<string | undefined> {
  for (const name of BROWSER_CANDIDATES) {
    try {
      const result = await $`which ${name}`.quiet()
      if (result.exitCode === 0) return name
    } catch {}
  }
}

type Params = Schema.Schema.Type<typeof Parameters>

async function takeScreenshot(params: Params): Promise<Buffer> {
  const browser = await findBrowser()
  if (!browser) throw new Error("No headless browser found. Install chromium or firefox.")

  const tmpFile = join(tmpdir(), `opencode-screenshot-${Date.now()}.png`)
  const w = params.width ?? 1280
  const h = params.height ?? 720

  const args =
    browser === "firefox"
      ? ["--headless", `--window-size=${w},${h}`, "--screenshot", tmpFile]
      : [
          `--headless=new`,
          `--disable-gpu`,
          `--no-sandbox`,
          `--window-size=${w},${h}`,
          `--screenshot=${tmpFile}`,
          `--hide-scrollbars`,
          `--virtual-time-budget=30000`,
        ]

  try {
    const proc = Bun.spawn([browser, ...args, params.url], {
      stdout: "pipe",
      stderr: "pipe",
    })
    await proc.exited
    if (proc.exitCode !== 0) {
      const err = await new Response(proc.stderr).text()
      throw new Error(`Browser exited with code ${proc.exitCode}: ${err}`)
    }
    return await readFile(tmpFile)
  } finally {
    try {
      await unlink(tmpFile)
    } catch {}
  }
}

export const BrowserTool = Tool.define(
  "browser",
  Effect.gen(function* () {
    return {
      description: DESCRIPTION,
      parameters: Parameters,
      execute: (params, ctx) =>
        Effect.gen(function* () {
          yield* ctx.ask({
            permission: "url",
            patterns: [params.url],
            always: ["*"],
            metadata: { url: params.url },
          })

          const w = params.width ?? 1280
          const h = params.height ?? 720
          const buf = yield* Effect.tryPromise(() => takeScreenshot(params))
          const base64 = Buffer.from(buf).toString("base64")

          return {
            title: `Screenshot of ${params.url}`,
            output: `Screenshot captured (${w}x${h} viewport)`,
            metadata: {},
            attachments: [
              {
                type: "file" as const,
                mime: "image/png",
                url: `data:image/png;base64,${base64}`,
              },
            ],
          }
        }).pipe(Effect.orDie),
    }
  }),
)
