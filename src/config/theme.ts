// Toggle dark mode globally; defaults to disabled until updated designs land.
type T = ImportMeta & { env: { VITE_ENABLE_DARK_MODE?: string } };
const envValue = (import.meta as T).env.VITE_ENABLE_DARK_MODE;

export const DARK_MODE_ENABLED = envValue === 'true';
export const DEFAULT_THEME = 'light' as const;
