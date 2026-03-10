import { pageEvent, type SetSemitonesDetail } from "@/shared/extension";
import { createLogger } from "@/shared/log";

// Prevent double-initialization (popup may re-inject on each open).
if ((window as unknown as Record<string, unknown>).__sps_initialized) {
  throw new Error("SPS already initialized");
}
(window as unknown as Record<string, unknown>).__sps_initialized = true;

const log = createLogger("SPS main");
log("main.ts loaded in MAIN world");

// Track the user-selected shift and each element's original playbackRate.
let semitones = 0;
const rateMap = new WeakMap<HTMLMediaElement, number>();
const listenedElements = new WeakSet<HTMLMediaElement>();

const proto = HTMLMediaElement.prototype;

const nativePlaybackRate = Object.getOwnPropertyDescriptor(
  proto,
  "playbackRate",
)!;
const nativePreservesPitch = Object.getOwnPropertyDescriptor(
  proto,
  "preservesPitch",
);
const nativeWebkitPreservesPitch = Object.getOwnPropertyDescriptor(
  proto,
  "webkitPreservesPitch" as keyof HTMLMediaElement,
);

const NativeAudio = window.Audio;
window.Audio = function (src?: string) {
  const audio = new NativeAudio(src);
  watchElement(audio);
  return audio;
} as unknown as typeof Audio;
window.Audio.prototype = NativeAudio.prototype;
Object.defineProperty(window.Audio, "length", { value: NativeAudio.length });

function multiplier() {
  return 2 ** (semitones / 12);
}

function shouldForcePreservesPitch() {
  return semitones !== 0;
}

function syncPitchPreservation(el: HTMLMediaElement) {
  if (!shouldForcePreservesPitch()) {
    return;
  }

  nativePreservesPitch?.set?.call(el, false);
  nativeWebkitPreservesPitch?.set?.call(el, false);
}

function setPitchProperty(
  descriptor: PropertyDescriptor | undefined,
  el: HTMLMediaElement,
  value: boolean,
) {
  descriptor?.set?.call(el, shouldForcePreservesPitch() ? false : value);
}

function getPitchProperty(
  descriptor: PropertyDescriptor | undefined,
  el: HTMLMediaElement,
) {
  return shouldForcePreservesPitch() ? false : descriptor?.get?.call(el);
}

// Apply the transposed playbackRate while preserving each element's base speed.
function applyRate(el: HTMLMediaElement) {
  if (!rateMap.has(el)) {
    rateMap.set(el, nativePlaybackRate.get!.call(el));
  }
  const base = rateMap.get(el)!;
  log("applyRate:", el.tagName, "base:", base, "multiplier:", multiplier());
  nativePlaybackRate.set!.call(el, base * multiplier());
  syncPitchPreservation(el);
}

function applyToAll() {
  document.querySelectorAll<HTMLMediaElement>("video, audio").forEach((el) => {
    if (!el.paused) {
      applyRate(el);
    }
  });
}

// Watch current and future media elements so playback changes stay in sync.
function watchElement(el: HTMLMediaElement) {
  if (listenedElements.has(el)) return;
  listenedElements.add(el);
  log("watching element:", el.tagName);

  const onPlay = () => {
    log("play event on", el.tagName, "- semitones:", semitones);
    if (semitones !== 0) applyRate(el);
  };
  el.addEventListener("play", onPlay);

  // If already playing, apply immediately
  if (!el.paused && semitones !== 0) {
    log("element already playing, applying immediately");
    applyRate(el);
  }
}

// Watch for new media elements added to the DOM.
new MutationObserver((mutations) => {
  for (const m of mutations) {
    for (const node of m.addedNodes) {
      if (node instanceof HTMLMediaElement) {
        log("new media element added:", node.tagName);
        watchElement(node);
      }
      if (node instanceof Element) {
        node
          .querySelectorAll<HTMLMediaElement>("video, audio")
          .forEach((el) => {
            log("new nested media element found:", el.tagName);
            watchElement(el);
          });
      }
    }
  }
}).observe(document.documentElement, { childList: true, subtree: true });

// Also watch any elements already in the DOM.
document
  .querySelectorAll<HTMLMediaElement>("video, audio")
  .forEach(watchElement);

// Patch media properties so page scripts still see the unshifted base rate.
Object.defineProperty(proto, "playbackRate", {
  set(value: number) {
    rateMap.set(this, value);
    nativePlaybackRate.set!.call(this, value * multiplier());
    syncPitchPreservation(this);
  },
  get() {
    return rateMap.get(this) ?? nativePlaybackRate.get!.call(this);
  },
  configurable: true,
  enumerable: true,
});

if (nativePreservesPitch) {
  Object.defineProperty(proto, "preservesPitch", {
    set(value: boolean) {
      setPitchProperty(nativePreservesPitch, this, value);
    },
    get() {
      return getPitchProperty(nativePreservesPitch, this);
    },
    configurable: true,
    enumerable: true,
  });
}

if (nativeWebkitPreservesPitch) {
  Object.defineProperty(
    proto,
    "webkitPreservesPitch" as keyof HTMLMediaElement,
    {
      set(value: boolean) {
        setPitchProperty(nativeWebkitPreservesPitch, this, value);
      },
      get() {
        return getPitchProperty(nativeWebkitPreservesPitch, this);
      },
      configurable: true,
      enumerable: true,
    },
  );
}

window.addEventListener(pageEvent.setSemitones, ((
  e: CustomEvent<SetSemitonesDetail>,
) => {
  log("received sps-set-semitones:", e.detail.semitones);
  semitones = e.detail.semitones;
  applyToAll();
}) as EventListener);

// Pick up initial semitones pre-set by the popup before this module loaded.
const initial = (window as unknown as Record<string, unknown>).__sps_initial;
if (typeof initial === "number" && initial !== 0) {
  log("applying pre-set initial semitones:", initial);
  semitones = initial;
  delete (window as unknown as Record<string, unknown>).__sps_initial;
  applyToAll();
}
