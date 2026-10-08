import Constants from "expo-constants";

const extra = (Constants.expoConfig?.extra ?? {}) as Record<
  string,
  string | undefined
>;

const API_URL =
  process.env.EXPO_PUBLIC_API_BASE_URL ?? // must be written exactly like this
  extra.API_URL;

if (!API_URL) {
  throw new Error("API_URL is missing. Set EXPO_PUBLIC_API_BASE_URL in .env");
}

export const Config = { API_URL: String(API_URL) } as const;
export const env = { apiBaseUrl: Config.API_URL } as const;
export default Config;

// Backwards-compatible shape for imports that expect `env` with `apiBaseUrl`
