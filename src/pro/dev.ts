declare const process: { env: { NODE_ENV?: string } };

/** True outside production builds. Bundlers replace `process.env.NODE_ENV`; where it is absent we assume development. */
export function isDev(): boolean {
  try {
    return process.env.NODE_ENV !== 'production';
  } catch {
    return true;
  }
}

const warned = new Set<string>();

/** Logs a warning once per message, in development only. Never throws. */
export function warnOnce(message: string): void {
  if (!isDev() || warned.has(message)) return;
  warned.add(message);
  console.warn(`[videojs-pro] ${message}`);
}

/** Test helper: forget which warnings were already shown. */
export function resetWarnings(): void {
  warned.clear();
}
