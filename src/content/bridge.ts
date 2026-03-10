import {
  pageEvent,
  runtimeMessage,
  type GetSemitonesResponse,
  type RuntimeMessage,
  type SetSemitonesDetail,
} from "@/shared/extension";
import { createLogger } from "@/shared/log";
import mainScript from "./main.ts?script&module";

const log = createLogger("SPS bridge");
log("bridge.ts loaded");

const scriptUrl = chrome.runtime.getURL(mainScript);
log("injecting main.ts from URL:", scriptUrl);

// Inject the page-world script as soon as the root element exists.
function injectScript() {
  const script = document.createElement("script");
  script.src = scriptUrl;
  script.type = "module";
  script.onerror = (event) => log("failed to load main.ts script:", event);
  (document.documentElement || document.head || document.body).prepend(script);
}

// At document_start, documentElement may not exist yet.
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

let mainReady = false;
let pendingSemitones: number | null = null;

// Bridge extension messages into page-level custom events.
function dispatch(semitones: number) {
  if (!mainReady) {
    log("main.ts not ready yet, queuing semitones:", semitones);
    pendingSemitones = semitones;
    return;
  }
  const detail: SetSemitonesDetail = { semitones };
  log("dispatching sps-set-semitones:", semitones);
  window.dispatchEvent(new CustomEvent(pageEvent.setSemitones, { detail }));
}

// Wait for the injected script to signal it is ready.
window.addEventListener(pageEvent.ready, () => {
  log("received sps-ready from main.ts");
  mainReady = true;
  if (pendingSemitones !== null) {
    log("flushing queued semitones:", pendingSemitones);
    dispatch(pendingSemitones);
    pendingSemitones = null;
  }
});

// Load the current tab state from the background worker.
const initialStateRequest: RuntimeMessage = {
  type: runtimeMessage.getSemitones,
};

chrome.runtime
  .sendMessage(initialStateRequest)
  .then((response) => {
    const state = response as GetSemitonesResponse | undefined;
    log("got response from background:", state);
    if (state) {
      dispatch(state.semitones);
    }
  })
  .catch((error) => {
    log("failed to send message to background:", error);
  });

// Listen for future state changes forwarded by the background worker.
chrome.runtime.onMessage.addListener((message: RuntimeMessage) => {
  log("received message:", message);
  if (message.type === runtimeMessage.setSemitones) {
    dispatch(message.semitones);
  }
});
