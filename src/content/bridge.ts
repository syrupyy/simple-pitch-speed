// Inject MAIN world script manually (CRXJS can't do world:"MAIN" properly)
import mainScript from './main.ts?script&module';
const script = document.createElement('script');
script.src = chrome.runtime.getURL(mainScript);
script.type = 'module';
document.documentElement.prepend(script);

let tabKey: string | undefined;

function dispatch(semitones: number) {
  window.dispatchEvent(
    new CustomEvent('sps-set-semitones', { detail: { semitones } }),
  );
}

// Get initial state + tab key from background
chrome.runtime.sendMessage({ type: 'get-semitones' }).then((response) => {
  if (response) {
    tabKey = response.tabKey;
    dispatch(response.semitones);
  }
});

// Listen for storage changes from popup (no messaging needed)
chrome.storage.session.onChanged.addListener((changes) => {
  if (tabKey && changes[tabKey]) {
    dispatch((changes[tabKey].newValue as number) ?? 0);
  }
});
