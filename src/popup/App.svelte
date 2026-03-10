<script lang="ts">
  let value = $state(0);
  let tabId = $state<number | undefined>();
  let status = $state('');

  let speed = $derived((2 ** (value / 12)).toFixed(2));

  async function init() {
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    tabId = tab?.id;
    if (tabId !== undefined) {
      const result = await chrome.storage.session.get(`tab-${tabId}`);
      value = result[`tab-${tabId}`] ?? 0;
    }
    status = tab?.url?.includes('youtube.com') ? 'Active' : 'Not on YouTube';
  }

  async function save() {
    if (tabId !== undefined) {
      await chrome.storage.session.set({ [`tab-${tabId}`]: value });
      // Send directly to the content script for live updates
      chrome.tabs.sendMessage(tabId, { type: 'set-semitones', semitones: value }).catch(() => {});
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
  .controls {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 6px;
    padding: 16px 20px;
  }

  button {
    width: 100%;
    height: 36px;
    font-size: 0.9em;
    cursor: pointer;
    border: 1px solid var(--border);
    border-radius: 6px;
    background: var(--surface);
    color: var(--accent);
    font-weight: 600;
    transition: background 0.15s, border-color 0.15s;
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
    box-sizing: border-box;
    text-align: center;
    font-size: 1.4em;
    font-weight: 600;
    padding: 8px;
    border: 2px solid var(--border);
    border-radius: 8px;
    background: var(--surface);
    color: var(--text);
    outline: none;
    transition: border-color 0.15s;
    -moz-appearance: textfield;
  }

  input[type="number"]:focus {
    border-color: var(--accent);
  }

  input[type="number"]::-webkit-inner-spin-button,
  input[type="number"]::-webkit-outer-spin-button {
    -webkit-appearance: none;
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
    font-size: 0.85em;
    font-weight: 600;
    color: var(--text);
  }

  .status {
    font-size: 0.75em;
    color: var(--text-muted);
  }
</style>
