import "dotenv/config";

// Maps public env vars into Constants.expoConfig.extra.
// For EAS builds, EAS injects build-time env vars into `process.env` here.
export default ({ config }) => {
  const extra = {
    ...(config.extra || {}),
    API_URL:
      process.env.EXPO_PUBLIC_API_BASE_URL || process.env.API_URL || null,
  };

  return {
    ...config,
    extra,
  };
};
