chrome.tabs.onRemoved.addListener((tabId) => {
  chrome.storage.session.remove(`tab-${tabId}`);
});

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.type === 'get-semitones' && sender.tab?.id !== undefined) {
    const tabKey = `tab-${sender.tab.id}`;
    chrome.storage.session.get(tabKey).then((result) => {
      sendResponse({ semitones: result[tabKey] ?? 0, tabKey });
    });
    return true;
  }
});
