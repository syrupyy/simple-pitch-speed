// Inject MAIN world script manually (CRXJS can't do world:"MAIN" properly)
import mainScript from './main.ts?script&module';

const PREFIX = '[SPS bridge]';
console.log(PREFIX, 'bridge.ts loaded');

const scriptUrl = chrome.runtime.getURL(mainScript);
console.log(PREFIX, 'injecting main.ts from URL:', scriptUrl);

function injectScript() {
  const script = document.createElement('script');
  script.src = scriptUrl;
  script.type = 'module';
  script.onerror = (e) => console.error(PREFIX, 'failed to load main.ts script:', e);
  (document.documentElement || document.head || document.body).prepend(script);
}

// At document_start, documentElement may not exist yet
if (document.documentElement) {
  injectScript();
} else {
  const obs = new MutationObserver(() => {
    if (document.documentElement) {
      obs.disconnect();
      injectScript();
    }
  });
  obs.observe(document, { childList: true });
}

let tabKey: string | undefined;
let mainReady = false;
let pendingSemitones: number | null = null;

function dispatch(semitones: number) {
  if (!mainReady) {
    console.log(PREFIX, 'main.ts not ready yet, queuing semitones:', semitones);
    pendingSemitones = semitones;
    return;
  }
  console.log(PREFIX, 'dispatching sps-set-semitones:', semitones);
  window.dispatchEvent(
    new CustomEvent('sps-set-semitones', { detail: { semitones } }),
  );
}

// Wait for main.ts to signal it's ready
window.addEventListener('sps-ready', () => {
  console.log(PREFIX, 'received sps-ready from main.ts');
  mainReady = true;
  if (pendingSemitones !== null) {
    console.log(PREFIX, 'flushing queued semitones:', pendingSemitones);
    dispatch(pendingSemitones);
    pendingSemitones = null;
  }
});

// Get initial state + tab key from background
chrome.runtime.sendMessage({ type: 'get-semitones' }).then((response) => {
  console.log(PREFIX, 'got response from background:', response);
  if (response) {
    tabKey = response.tabKey;
    dispatch(response.semitones);
  }
}).catch((err) => {
  console.error(PREFIX, 'failed to send message to background:', err);
});

// Listen for storage changes from popup (no messaging needed)
chrome.storage.session.onChanged.addListener((changes) => {
  console.log(PREFIX, 'storage changed:', changes, 'tabKey:', tabKey);
  if (tabKey && changes[tabKey]) {
    dispatch((changes[tabKey].newValue as number) ?? 0);
  }
});
