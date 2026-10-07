import Constants from "expo-constants";

const extraConfig = (Constants.expoConfig?.extra ?? {}) as Record<
  string,
  string | undefined
>;

const required = (value: unknown, name: string) => {
  if (value === undefined || value === null || value === "") {
    throw new Error(`${name} is missing`);
  }
  return value as string;
};

export const Config = {
  API_URL: required(
    extraConfig.API_URL ?? extraConfig.EXPO_PUBLIC_API_BASE_URL,
    "API_URL",
  ),
} as const;

export default Config;

// Backwards-compatible shape for imports that expect `env` with `apiBaseUrl`
export const env = {
  apiBaseUrl: Config.API_URL,
} as const;
