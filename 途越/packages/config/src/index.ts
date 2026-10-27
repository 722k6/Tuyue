export const DEFAULT_API_PORT = 3000;

export function parseCorsOrigins(value: string | undefined): string[] {
  return (value ?? 'http://localhost:5173,http://localhost:5174')
    .split(',')
    .map((origin) => origin.trim())
    .filter(Boolean);
}
