import {
  getStoredSemitones,
  getTabIdFromKey,
  getTabKey,
  runtimeMessage,
  type GetSemitonesResponse,
  type RuntimeMessage,
  type SetSemitonesMessage,
} from "@/shared/extension";
import { createLogger } from "@/shared/log";

const log = createLogger("SPS bg");
log("background service worker started");

// Relay tab-scoped storage updates to the matching content bridge.
chrome.storage.session.onChanged.addListener((changes) => {
  for (const [key, change] of Object.entries(changes)) {
    const tabId = getTabIdFromKey(key);
    if (tabId === null) {
      continue;
    }

    const message: SetSemitonesMessage = {
      type: runtimeMessage.setSemitones,
      semitones: getStoredSemitones(change.newValue),
    };

    log("forwarding semitones to tab", tabId, ":", message.semitones);
    chrome.tabs.sendMessage(tabId, message).catch(() => {
      /* tab may not have content script */
    });
  }
});

// Clean up per-tab state when a tab closes.
chrome.tabs.onRemoved.addListener((tabId) => {
  log("tab removed:", tabId);
  chrome.storage.session.remove(getTabKey(tabId));
});

// Answer state requests from the extension-world bridge script.
chrome.runtime.onMessage.addListener(
  (message: RuntimeMessage, sender, sendResponse) => {
    log("received message:", message, "from tab:", sender.tab?.id);
    if (
      message.type === runtimeMessage.getSemitones &&
      sender.tab?.id !== undefined
    ) {
      const tabKey = getTabKey(sender.tab.id);
      chrome.storage.session.get(tabKey).then((result) => {
        const response: GetSemitonesResponse = {
          semitones: getStoredSemitones(result[tabKey]),
        };
        log("responding with:", response);
        sendResponse(response);
      });
      return true;
    }
  },
);
