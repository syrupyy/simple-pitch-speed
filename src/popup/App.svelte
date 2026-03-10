<script lang="ts">
  import { getStoredSemitones, getTabKey } from "@/shared/extension";
  import mainScript from "@/content/main.ts?script&module";

  let value = $state(0);
  let tabId = $state<number | undefined>();
  let status = $state("");
  let isWebPage = false;

  let speed = $derived((2 ** (value / 12)).toFixed(2));

  const mainScriptUrl = chrome.runtime.getURL(mainScript);

  /** Inject main.ts into the page world (idempotent via data-sps guard). */
  async function ensureInjected(id: number) {
    await chrome.scripting.executeScript({
      target: { tabId: id },
      func: (url: string) => {
        if (document.querySelector("script[data-sps]")) return;
        const s = document.createElement("script");
        s.src = url;
        s.type = "module";
        s.dataset.sps = "";
        (document.documentElement || document.head || document.body).prepend(s);
      },
      args: [mainScriptUrl],
    });
  }

  /** Dispatch semitones to the page world. Event name must match pageEvent.setSemitones. */
  async function sendSemitones(id: number, semitones: number) {
    await chrome.scripting.executeScript({
      target: { tabId: id },
      world: "MAIN",
      func: (s: number) => {
        window.dispatchEvent(
          new CustomEvent("sps-set-semitones", { detail: { semitones: s } }),
        );
      },
      args: [semitones],
    });
  }

  // Bootstrap popup state from the active tab.
  async function init() {
    const [tab] = await chrome.tabs.query({
      active: true,
      currentWindow: true,
    });
    tabId = tab?.id;
    if (tabId !== undefined) {
      const tabKey = getTabKey(tabId);
      const result = await chrome.storage.session.get(tabKey);
      value = getStoredSemitones(result[tabKey]);
    }
    isWebPage =
      tab?.url?.startsWith("http://") || tab?.url?.startsWith("https://") || false;
    status = isWebPage ? "Active" : "Not a web page";

    if (isWebPage && tabId !== undefined) {
      // Pre-set initial semitones for main.ts to pick up before its listener is ready.
      await chrome.scripting.executeScript({
        target: { tabId },
        world: "MAIN",
        func: (s: number) => {
          (window as Record<string, unknown>).__sps_initial = s;
        },
        args: [value],
      });
      await ensureInjected(tabId);
    }
  }

  // Persist the value and relay to the page.
  async function save() {
    if (tabId !== undefined) {
      await chrome.storage.session.set({ [getTabKey(tabId)]: value });
      if (isWebPage) {
        await sendSemitones(tabId, value);
      }
    }
  }

  function clamp(v: number) {
    return Math.max(-48, Math.min(48, v));
  }

  function increment() {
    value = clamp(value + 1);
    save();
  }

  function decrement() {
    value = clamp(value - 1);
    save();
  }

  function onInput() {
    value = clamp(value);
    save();
  }

  init();
</script>

<div class="controls">
  <button onclick={increment}>&#9650;</button>
  <input type="number" bind:value oninput={onInput} min="-48" max="48" />
  <button onclick={decrement}>&#9660;</button>
</div>
<div class="info">
  <span class="speed">{speed}x</span>
  {#if status}
    <span class="status">{status}</span>
  {/if}
</div>

<style>
  * {
    box-sizing: border-box;
  }

  .controls {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 6px;
    padding: 16px 20px;
  }

  button {
    width: 66.66666666666667%;
    height: 41px;
    font-size: 1.5em;
    cursor: pointer;
    border: 1px solid var(--border);
    border-radius: 6px;
    background: var(--surface);
    color: var(--accent);
    font-weight: 600;
    transition:
      background 0.15s,
      border-color 0.15s;
  }

  button:hover {
    background: var(--accent);
    border-color: var(--accent);
    color: #fff;
  }

  button:active {
    background: var(--accent-hover);
    border-color: var(--accent-hover);
    color: #fff;
  }

  input[type="number"] {
    width: 100%;
    text-align: center;
    font-size: 1.5em;
    font-weight: 600;
    padding: 8px;
    border: 2px solid var(--border);
    border-radius: 8px;
    background: var(--surface);
    color: var(--text);
    outline: none;
    transition: border-color 0.15s;
    -moz-appearance: textfield;
    appearance: textfield;
  }

  input[type="number"]:focus {
    border-color: var(--accent);
  }

  input[type="number"]::-webkit-inner-spin-button,
  input[type="number"]::-webkit-outer-spin-button {
    -webkit-appearance: none;
    appearance: none;
    margin: 0;
  }

  .info {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 2px;
    padding: 0 20px 12px;
  }

  .speed {
    font-size: 0.825em;
    font-weight: 600;
    color: var(--text);
  }

  .status {
    font-size: 0.75em;
    color: var(--text-muted);
  }
</style>
