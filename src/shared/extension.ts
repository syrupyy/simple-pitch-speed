export const pageEvent = {
  setSemitones: "sps-set-semitones",
} as const;

export type SetSemitonesDetail = {
  semitones: number;
};

export function getTabKey(tabId: number) {
  return `tab-${tabId}`;
}

export function getStoredSemitones(value: unknown) {
  return typeof value === "number" ? value : 0;
}
