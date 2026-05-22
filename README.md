<p align="center">
  <a href="https://opencode.ai">
    <picture>
      <source srcset="packages/console/app/src/asset/logo-ornate-dark.svg" media="(prefers-color-scheme: dark)">
      <source srcset="packages/console/app/src/asset/logo-ornate-light.svg" media="(prefers-color-scheme: light)">
      <img src="packages/console/app/src/asset/logo-ornate-light.svg" alt="OpenCode logo">
    </picture>
  </a>
</p>
<p align="center">The open source AI coding agent.</p>
<p align="center">
  <a href="https://opencode.ai/discord"><img alt="Discord" src="https://img.shields.io/discord/1391832426048651334?style=flat-square&label=discord" /></a>
  <a href="https://www.npmjs.com/package/opencode-ai"><img alt="npm" src="https://img.shields.io/npm/v/opencode-ai?style=flat-square" /></a>
  <a href="https://github.com/anomalyco/opencode/actions/workflows/publish.yml"><img alt="Build status" src="https://img.shields.io/github/actions/workflow/status/anomalyco/opencode/publish.yml?style=flat-square&branch=dev" /></a>
</p>

<p align="center">
  <a href="README.md">English</a> |
  <a href="README.zh.md">简体中文</a> |
  <a href="README.zht.md">繁體中文</a> |
  <a href="README.ko.md">한국어</a> |
  <a href="README.de.md">Deutsch</a> |
  <a href="README.es.md">Español</a> |
  <a href="README.fr.md">Français</a> |
  <a href="README.it.md">Italiano</a> |
  <a href="README.da.md">Dansk</a> |
  <a href="README.ja.md">日本語</a> |
  <a href="README.pl.md">Polski</a> |
  <a href="README.ru.md">Русский</a> |
  <a href="README.bs.md">Bosanski</a> |
  <a href="README.ar.md">العربية</a> |
  <a href="README.no.md">Norsk</a> |
  <a href="README.br.md">Português (Brasil)</a> |
  <a href="README.th.md">ไทย</a> |
  <a href="README.tr.md">Türkçe</a> |
  <a href="README.uk.md">Українська</a> |
  <a href="README.bn.md">বাংলা</a> |
  <a href="README.gr.md">Ελληνικά</a> |
  <a href="README.vi.md">Tiếng Việt</a>
</p>

[![OpenCode Terminal UI](packages/web/src/assets/lander/screenshot.png)](https://opencode.ai)

---

### Installation

```bash
# YOLO
curl -fsSL https://opencode.ai/install | bash

# Package managers
npm i -g opencode-ai@latest        # or bun/pnpm/yarn
scoop install opencode             # Windows
choco install opencode             # Windows
brew install anomalyco/tap/opencode # macOS and Linux (recommended, always up to date)
brew install opencode              # macOS and Linux (official brew formula, updated less)
sudo pacman -S opencode            # Arch Linux (Stable)
paru -S opencode-bin               # Arch Linux (Latest from AUR)
mise use -g opencode               # Any OS
nix run nixpkgs#opencode           # or github:anomalyco/opencode for latest dev branch
```

> [!TIP]
> Remove versions older than 0.1.x before installing.

### Desktop App (BETA)

OpenCode is also available as a desktop application. Download directly from the [releases page](https://github.com/anomalyco/opencode/releases) or [opencode.ai/download](https://opencode.ai/download).

| Platform              | Download                           |
| --------------------- | ---------------------------------- |
| macOS (Apple Silicon) | `opencode-desktop-mac-arm64.dmg`   |
| macOS (Intel)         | `opencode-desktop-mac-x64.dmg`     |
| Windows               | `opencode-desktop-windows-x64.exe` |
| Linux                 | `.deb`, `.rpm`, or `.AppImage`     |

```bash
# macOS (Homebrew)
brew install --cask opencode-desktop
# Windows (Scoop)
scoop bucket add extras; scoop install extras/opencode-desktop
```

#### Installation Directory

The install script respects the following priority order for the installation path:

1. `$OPENCODE_INSTALL_DIR` - Custom installation directory
2. `$XDG_BIN_DIR` - XDG Base Directory Specification compliant path
3. `$HOME/bin` - Standard user binary directory (if it exists or can be created)
4. `$HOME/.opencode/bin` - Default fallback

```bash
# Examples
OPENCODE_INSTALL_DIR=/usr/local/bin curl -fsSL https://opencode.ai/install | bash
XDG_BIN_DIR=$HOME/.local/bin curl -fsSL https://opencode.ai/install | bash
```

### Agents

OpenCode includes two built-in agents you can switch between with the `Tab` key.

- **build** - Default, full-access agent for development work
- **plan** - Read-only agent for analysis and code exploration
  - Denies file edits by default
  - Asks permission before running bash commands
  - Ideal for exploring unfamiliar codebases or planning changes

Also included is a **general** subagent for complex searches and multistep tasks.
This is used internally and can be invoked using `@general` in messages.

Learn more about [agents](https://opencode.ai/docs/agents).

### Documentation

For more info on how to configure OpenCode, [**head over to our docs**](https://opencode.ai/docs).

### Contributing

If you're interested in contributing to OpenCode, please read our [contributing docs](./CONTRIBUTING.md) before submitting a pull request.

### Building on OpenCode

If you are working on a project that's related to OpenCode and is using "opencode" as part of its name, for example "opencode-dashboard" or "opencode-mobile", please add a note to your README to clarify that it is not built by the OpenCode team and is not affiliated with us in any way.

---

### Building from Source

OpenCode can run on two runtimes: **Bun** (default, includes TUI) and **Node.js** (headless/server-only). Choose based on your needs.

#### Prerequisites

| Dependency | Bun build | Node.js build |
|---|---|---|
| git | required | required |
| Bun ≥ 1.2 | required | not needed |
| Node.js ≥ 22.12 | not needed | required |
| better-sqlite3 | not needed | required (auto-installed by npm) |
| C++ build tools | for better-sqlite3 | for better-sqlite3 |

#### Clone & Install

```bash
git clone https://github.com/anomalyco/opencode.git
cd opencode/packages/opencode
```

#### Bun Build (TUI + Server + CLI)

```bash
# Build standalone binary (outputs dist/opencode-<platform>/bin/opencode)
bun run script/build.ts

# For CPUs without AVX2 (Core 2 Duo, Athlon, Pentium):
bun run script/build.ts --baseline
```

#### Node.js Build (Server + CLI, no TUI)

First install Node.js if needed. On older CPUs (Core 2 Duo), build from source:

```bash
# Download Node.js source
curl -O https://nodejs.org/dist/v22.14.0/node-v22.14.0.tar.xz
tar xf node-v22.14.0.tar.xz
cd node-v22.14.0

# Configure for Core 2 Duo (SSE4.1, no AVX)
./configure \
  --without-npm \
  --without-corepack \
  --enable-optimized-for-Core2 \
  --with-intl=none

make -j$(nproc)          # ~20 min on Core 2 Duo
sudo make install
```

Install opencode dependencies and run:

```bash
cd packages/opencode
npm install               # installs tsx, better-sqlite3, drizzle-orm
npm install -g tsx        # optional: install tsx globally

# Run server (headless)
npx tsx src/index.ts serve --hostname 127.0.0.1 --port 4096

# Run CLI commands
npx tsx src/index.ts run "explain this codebase"
npx tsx src/index.ts export <sessionID>
```

#### Full Build Pipeline (Bun + Node.js combined)

For release packaging that includes both runtimes:

```bash
cd packages/opencode

# 1. Bun standalone binary
bun run script/build.ts --baseline    # skip --baseline if CPU supports AVX2

# 2. TypeScript compile for Node.js
npx tsc --skipLibCheck --outDir dist/node --rootDir src \
  --module node16 --target es2022 --moduleResolution node16 \
  --esModuleInterop

# 3. Arch Linux package (requires libarchive-tools, zstd)
BIN="dist/opencode-linux-x64-baseline/bin/opencode" \
PKG="opencode-$(node -p 'require("./package.json").version')" \
  mkdir -p pkg/usr/bin && cp "$BIN" pkg/usr/bin/opencode && \
  bsdtar -cf "$PKG.pkg.tar" -C pkg . && zstd -z "$PKG.pkg.tar" -o "$PKG.pkg.tar.zst" --rm
```

#### Platform-Specific Notes

**Linux x86_64 (Core 2 Duo / no AVX2)**:
- Use `--baseline` flag when building with Bun (skips AVX2-only optimizations)
- Build Node.js with `--enable-optimized-for-Core2`
- Set `-j2` for `make` (Core 2 Duo has 2 cores)

**Linux aarch64 (ARM, e.g. Raspberry Pi 5)**:
- Builds natively — no special flags needed
- better-sqlite3 compiles from source via node-gyp
- For very low-memory devices (≤2GB RAM), prefer Node.js headless build

**macOS**:
- Xcode Command Line Tools required (`xcode-select --install`)
- ARM Macs: native `aarch64` build
- Intel Macs: supports `--baseline` for older CPUs

---

**Join our community** [Discord](https://discord.gg/opencode) | [X.com](https://x.com/opencode)
