/** The app's version, shown in the grown-ups' area: package.json's version, the commit and the build date. */
export interface AppVersion {
  version: string
  build: string
  /** YYYY-MM-DD (UTC), or '' when unknown. */
  built: string
}

export function appVersion(): AppVersion {
  return {
    version: import.meta.env.APP_VERSION ?? 'dev',
    build: import.meta.env.APP_BUILD ?? 'dev',
    built: import.meta.env.APP_BUILT ?? '',
  }
}

/** "Version 1.0.0 · build c65c177 · 2026-11-25". */
export function versionLine(v: AppVersion = appVersion()): string {
  return [`Version ${v.version}`, `build ${v.build}`, v.built].filter(Boolean).join(' · ')
}
