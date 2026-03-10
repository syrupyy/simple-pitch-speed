const PREFIX = '[SPS bg]';
console.log(PREFIX, 'background service worker started');

// Forward storage changes to the appropriate tab's content script
chrome.storage.session.onChanged.addListener((changes) => {
  for (const [key, change] of Object.entries(changes)) {
    const match = key.match(/^tab-(\d+)$/);
    if (match) {
      const tabId = Number(match[1]);
      console.log(PREFIX, 'forwarding semitones to tab', tabId, ':', change.newValue);
      chrome.tabs.sendMessage(tabId, {
        type: 'set-semitones',
        semitones: change.newValue ?? 0,
      }).catch(() => {/* tab may not have content script */});
    }
  }
});

chrome.tabs.onRemoved.addListener((tabId) => {
  console.log(PREFIX, 'tab removed:', tabId);
  chrome.storage.session.remove(`tab-${tabId}`);
});

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  console.log(PREFIX, 'received message:', message, 'from tab:', sender.tab?.id);
  if (message.type === 'get-semitones' && sender.tab?.id !== undefined) {
    const tabKey = `tab-${sender.tab.id}`;
    chrome.storage.session.get(tabKey).then((result) => {
      const response = { semitones: result[tabKey] ?? 0, tabKey };
      console.log(PREFIX, 'responding with:', response);
      sendResponse(response);
    });
    return true;
  }
});
