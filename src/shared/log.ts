export function createLogger(scope: string) {
  return (...args: unknown[]) => {
    if (import.meta.env.PROD) {
      return;
    }

    console.log(`[${scope}]`, ...args);
  };
}
