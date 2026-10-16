function port(name: string, fallback: number): number {
  const value = Number(process.env[name] ?? fallback);
  if (!Number.isInteger(value) || value < 1024 || value > 65535) throw new Error(`${name} must be a port between 1024 and 65535.`);
  return value;
}

export const API_PORT = port('E2E_API_PORT', 4001);
export const WEB_PORT = port('E2E_WEB_PORT', 5174);
export const WEB_URL = `http://127.0.0.1:${WEB_PORT}`;
export const API_URL = `http://127.0.0.1:${API_PORT}/api/v1`;
