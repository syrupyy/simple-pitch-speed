// MAIN world content script — zero imports (CRXJS requirement)

const PREFIX = '[SPS main]';
console.log(PREFIX, 'main.ts loaded in MAIN world');

let semitones = 0;
const rateMap = new WeakMap<HTMLMediaElement, number>();
const listenedElements = new WeakSet<HTMLMediaElement>();

const proto = HTMLMediaElement.prototype;

const nativePlaybackRate = Object.getOwnPropertyDescriptor(proto, 'playbackRate')!;
const nativePreservesPitch = Object.getOwnPropertyDescriptor(proto, 'preservesPitch');
const nativeWebkitPreservesPitch = Object.getOwnPropertyDescriptor(proto, 'webkitPreservesPitch' as keyof HTMLMediaElement);

function multiplier() {
  return 2 ** (semitones / 12);
}

function applyRate(el: HTMLMediaElement) {
  if (!rateMap.has(el)) {
    rateMap.set(el, nativePlaybackRate.get!.call(el));
  }
  const base = rateMap.get(el)!;
  console.log(PREFIX, 'applyRate:', el.tagName, 'base:', base, 'multiplier:', multiplier());
  nativePlaybackRate.set!.call(el, base * multiplier());
  if (semitones !== 0) {
    nativePreservesPitch?.set?.call(el, false);
    nativeWebkitPreservesPitch?.set?.call(el, false);
  }
}

function applyToAll() {
  document.querySelectorAll<HTMLMediaElement>('video, audio').forEach((el) => {
    if (!el.paused) {
      applyRate(el);
    }
  });
}

// Listen for play event on a media element so we apply rate when playback starts
function watchElement(el: HTMLMediaElement) {
  if (listenedElements.has(el)) return;
  listenedElements.add(el);
  console.log(PREFIX, 'watching element:', el.tagName);

  const onPlay = () => {
    console.log(PREFIX, 'play event on', el.tagName, '— semitones:', semitones);
    if (semitones !== 0) applyRate(el);
  };
  el.addEventListener('play', onPlay);

  // If already playing, apply immediately
  if (!el.paused && semitones !== 0) {
    console.log(PREFIX, 'element already playing, applying immediately');
    applyRate(el);
  }
}

// Watch for new media elements added to the DOM
new MutationObserver((mutations) => {
  for (const m of mutations) {
    for (const node of m.addedNodes) {
      if (node instanceof HTMLMediaElement) {
        console.log(PREFIX, 'new media element added:', node.tagName);
        watchElement(node);
      }
      if (node instanceof Element) {
        node.querySelectorAll<HTMLMediaElement>('video, audio').forEach((el) => {
          console.log(PREFIX, 'new nested media element found:', el.tagName);
          watchElement(el);
        });
      }
    }
  }
}).observe(document.documentElement, { childList: true, subtree: true });

// Also watch any elements already in the DOM
document.querySelectorAll<HTMLMediaElement>('video, audio').forEach(watchElement);

// Override playbackRate setter/getter
Object.defineProperty(proto, 'playbackRate', {
  set(value: number) {
    rateMap.set(this, value);
    nativePlaybackRate.set!.call(this, value * multiplier());
    if (semitones !== 0) {
      nativePreservesPitch?.set?.call(this, false);
      nativeWebkitPreservesPitch?.set?.call(this, false);
    }
  },
  get() {
    return rateMap.get(this) ?? nativePlaybackRate.get!.call(this);
  },
  configurable: true,
  enumerable: true,
});

if (nativePreservesPitch) {
  Object.defineProperty(proto, 'preservesPitch', {
    set(value: boolean) {
      if (semitones === 0) {
        nativePreservesPitch.set!.call(this, value);
      } else {
        nativePreservesPitch.set!.call(this, false);
      }
    },
    get() {
      if (semitones === 0) return nativePreservesPitch.get!.call(this);
      return false;
    },
    configurable: true,
    enumerable: true,
  });
}

if (nativeWebkitPreservesPitch) {
  Object.defineProperty(proto, 'webkitPreservesPitch' as keyof HTMLMediaElement, {
    set(value: boolean) {
      if (semitones === 0) {
        nativeWebkitPreservesPitch.set!.call(this, value);
      } else {
        nativeWebkitPreservesPitch.set!.call(this, false);
      }
    },
    get() {
      if (semitones === 0) return nativeWebkitPreservesPitch.get!.call(this);
      return false;
    },
    configurable: true,
    enumerable: true,
  });
}

window.addEventListener('sps-set-semitones', ((e: CustomEvent<{ semitones: number }>) => {
  console.log(PREFIX, 'received sps-set-semitones:', e.detail.semitones);
  semitones = e.detail.semitones;
  applyToAll();
}) as EventListener);

console.log(PREFIX, 'dispatching sps-ready');
window.dispatchEvent(new CustomEvent('sps-ready'));
