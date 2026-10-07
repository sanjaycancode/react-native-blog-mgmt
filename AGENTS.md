# Boilerplate — AI Agent Instructions

Tech: Expo SDK 57, TypeScript strict, Expo Router, TanStack React Query v5 +
AsyncStorage persistence, Axios, `StyleSheet` + tokens in `constants/Themes.ts`.

Providers (`app/_layout.tsx`): `ReactQueryProvider > SafeAreaProvider >
GestureHandlerRootView > ThemeProvider > AuthProvider > Stack`.

## Rules

- Screens in `app/` (Expo Router). Reusable UI in `components/`. New domain:
  `[domain]Service.ts` + `use[Domain]Api.ts` + `[domain].ts` + barrels.
- Theme: `const { theme } = useTheme()` + `createStyles(theme)` at file bottom.
  No hardcoded colors/spacing. `<ThemedText>` for all text.
- API: typed Axios generics, return `response.data`, no try/catch in services.
  Invalidate query keys in mutation `onSuccess`.
- Env via `env.*` from `@/lib/config/env` only. `@/` imports only.
