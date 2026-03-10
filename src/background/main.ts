import { getTabKey } from "@/shared/extension";
import { createLogger } from "@/shared/log";

const log = createLogger("SPS bg");
log("background service worker started");

// Clean up per-tab state when a tab closes.
chrome.tabs.onRemoved.addListener((tabId) => {
  log("tab removed:", tabId);
  chrome.storage.session.remove(getTabKey(tabId));
});
