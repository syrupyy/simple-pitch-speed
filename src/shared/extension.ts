export const tabKeyPrefix = "tab-";

export const runtimeMessage = {
  getSemitones: "get-semitones",
  setSemitones: "set-semitones",
} as const;

export const pageEvent = {
  ready: "sps-ready",
  setSemitones: "sps-set-semitones",
} as const;

export type GetSemitonesMessage = {
  type: typeof runtimeMessage.getSemitones;
};

export type SetSemitonesMessage = {
  type: typeof runtimeMessage.setSemitones;
  semitones: number;
};

export type RuntimeMessage = GetSemitonesMessage | SetSemitonesMessage;

export type GetSemitonesResponse = {
  semitones: number;
};

export type SetSemitonesDetail = {
  semitones: number;
};

export function getTabKey(tabId: number) {
  return `${tabKeyPrefix}${tabId}`;
}

export function getTabIdFromKey(key: string) {
  if (!key.startsWith(tabKeyPrefix)) {
    return null;
  }

  const tabId = Number(key.slice(tabKeyPrefix.length));
  return Number.isInteger(tabId) ? tabId : null;
}

export function getStoredSemitones(value: unknown) {
  return typeof value === "number" ? value : 0;
}
