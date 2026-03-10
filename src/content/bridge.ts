// Inject MAIN world script manually (CRXJS can't do world:"MAIN" properly)
import { createLogger } from "@/shared/log";
import mainScript from "./main.ts?script&module";

const log = createLogger("SPS bridge");
log("bridge.ts loaded");

const scriptUrl = chrome.runtime.getURL(mainScript);
log("injecting main.ts from URL:", scriptUrl);

function injectScript() {
  const script = document.createElement("script");
  script.src = scriptUrl;
  script.type = "module";
  script.onerror = (event) => log("failed to load main.ts script:", event);
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

let mainReady = false;
let pendingSemitones: number | null = null;

function dispatch(semitones: number) {
  if (!mainReady) {
    log("main.ts not ready yet, queuing semitones:", semitones);
    pendingSemitones = semitones;
    return;
  }
  log("dispatching sps-set-semitones:", semitones);
  window.dispatchEvent(
    new CustomEvent("sps-set-semitones", { detail: { semitones } }),
  );
}

// Wait for main.ts to signal it's ready
window.addEventListener("sps-ready", () => {
  log("received sps-ready from main.ts");
  mainReady = true;
  if (pendingSemitones !== null) {
    log("flushing queued semitones:", pendingSemitones);
    dispatch(pendingSemitones);
    pendingSemitones = null;
  }
});

// Get initial state from background
chrome.runtime
  .sendMessage({ type: "get-semitones" })
  .then((response) => {
    log("got response from background:", response);
    if (response) {
      dispatch(response.semitones);
    }
  })
  .catch((error) => {
    log("failed to send message to background:", error);
  });

// Listen for semitone updates forwarded from the background script
chrome.runtime.onMessage.addListener((message) => {
  log("received message:", message);
  if (message.type === "set-semitones") {
    dispatch(message.semitones);
  }
});
