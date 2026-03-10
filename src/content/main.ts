// MAIN world content script — zero imports (CRXJS requirement)

let semitones = 0;
const rateMap = new WeakMap<HTMLMediaElement, number>();

const proto = HTMLMediaElement.prototype;

const nativePlaybackRate = Object.getOwnPropertyDescriptor(proto, 'playbackRate')!;
const nativePreservesPitch = Object.getOwnPropertyDescriptor(proto, 'preservesPitch');
const nativeWebkitPreservesPitch = Object.getOwnPropertyDescriptor(proto, 'webkitPreservesPitch' as keyof HTMLMediaElement);

function multiplier() {
  return 2 ** (semitones / 12);
}

function applyRate(el: HTMLMediaElement) {
  // Capture current native rate for elements created before the override
  if (!rateMap.has(el)) {
    rateMap.set(el, nativePlaybackRate.get!.call(el));
  }
  const base = rateMap.get(el)!;
  nativePlaybackRate.set!.call(el, base * multiplier());
  if (semitones !== 0) {
    nativePreservesPitch?.set?.call(el, false);
    nativeWebkitPreservesPitch?.set?.call(el, false);
  }
}

function applyToAll() {
  document.querySelectorAll<HTMLMediaElement>('video, audio').forEach(applyRate);
}

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
  semitones = e.detail.semitones;
  applyToAll();
}) as EventListener);

window.dispatchEvent(new CustomEvent('sps-ready'));
