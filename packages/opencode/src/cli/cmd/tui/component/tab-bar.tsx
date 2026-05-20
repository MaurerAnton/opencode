import { Show, For, createMemo } from "solid-js"
import { useLocal } from "@tui/context/local"
import { useSync } from "@tui/context/sync"
import { useTheme } from "@tui/context/theme"
import { useRoute } from "@tui/context/route"
import { useCommandShortcut } from "../../keymap"

export function TabBar() {
  const local = useLocal()
  const sync = useSync()
  const route = useRoute()
  const { theme } = useTheme()
  const nextKey = useCommandShortcut("session.tab.next")
  const closeKey = useCommandShortcut("session.tab.close")

  const tabs = createMemo(() =>
    local.session.tabs.filter((id) => sync.data.session.some((s) => s.id === id)),
  )

  const active = createMemo(() => (route.data.type === "session" ? route.data.sessionID : undefined))

  function title(id: string) {
    const s = sync.session.get(id)
    return s?.title || id.slice(0, 8)
  }

  return (
    <Show when={tabs().length > 0}>
      <box flexDirection="row" flexShrink={0} marginBottom={1}>
        <For each={tabs()}>
          {(id) => {
            const isActive = id === active()
            return (
              <box
                flexDirection="row"
                flexShrink={0}
                paddingTop={1}
                paddingBottom={0}
                paddingLeft={2}
                paddingRight={2}
                border={isActive ? ["top"] : undefined}
                borderColor={isActive ? theme.primary : theme.background}
              >
                <text fg={isActive ? theme.primary : theme.textMuted} wrapMode="none">
                  {isActive ? "● " : "○ "}
                  {title(id)} ×
                </text>
              </box>
            )
          }}
        </For>
        <box flexGrow={1} border={["top"]} borderColor={theme.background} />
        <box paddingRight={2} paddingTop={1}>
          <text fg={theme.textMuted} wrapMode="none">
            {nextKey()} next · {closeKey()} close
          </text>
        </box>
      </box>
    </Show>
  )
}
