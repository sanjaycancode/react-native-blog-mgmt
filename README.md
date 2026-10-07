# Expo React Native Boilerplate

An Expo SDK 57 starter with Expo Router, TypeScript, a theme system, stub authentication, and an Axios + TanStack React Query data layer. Home and Settings work without an API; the todo service and hooks are optional examples.

## Prerequisites

- Node.js and npm (the EAS build profiles use Node.js 22.14.0).
- An Android emulator, iOS simulator, or compatible device for native development. You can also run the web target in a browser.

## Get started

1. Install dependencies:

   ```sh
   npm install
   ```

2. When you add API calls, copy the environment template and set your API base URL:

   ```powershell
   Copy-Item .env.example .env
   ```

   On macOS or Linux, use `cp .env.example .env`. Replace `https://example.com/api` in `.env` with an API reachable from your emulator or device. The example todo service calls `/todos` and `/todos/:id` relative to this base URL when you use its hooks.

3. Start Expo:

   ```sh
   npm run start
   ```

   From the Expo terminal, open an available Android emulator, iOS simulator, or web browser. For a direct web start, run `npm run web`. To build and run a native development app locally, use `npm run android` or `npm run ios` with the corresponding native toolchain installed.

4. On the login screen, enter any username and a password of at least eight characters. Login is currently a local stub; it does not call an authentication server.

## Project map

| Path | Purpose |
| --- | --- |
| `app/` | Expo Router screens and layouts; session-aware entry, Home and Settings tabs, and an Appearance screen. |
| `components/` | Reusable themed UI components. |
| `constants/Themes.ts`, `context/ThemeContext.tsx` | Light and dark theme tokens and theme state. |
| `context/AuthContext.tsx` | Demo login, logout, and local session storage. |
| `api/client.ts`, `api/services/` | Axios client, error normalization, and typed service functions. |
| `hooks/api/` | React Query hooks, query keys, and mutation invalidation. |
| `lib/react-query/` | Query client and AsyncStorage persistence. |
| `lib/config/env.ts` | Validated runtime configuration. |
| `types/` | Shared TypeScript types. |

## Build your app

- Replace the demo authentication in `context/AuthContext.tsx` with your own auth service and token handling.
- Use the todo files (`api/services/todoService.ts`, `hooks/api/useTodoApi.ts`, and `types/todo.ts`) as a pattern for a new domain. Add screens under `app/` and reusable UI under `components/`.
- Import through the `@/` alias. Use `useTheme()` and `createStyles(theme)` for styles, theme tokens for colors and spacing, and `ThemedText` for text.
- Keep API requests in typed service functions that return `response.data`. Invalidate affected query keys after successful mutations.
- Replace the neutral icon and splash assets in `assets/images/` with your branding, and set app identity in `app.json`. Before using EAS builds, replace the placeholder project ID, update URL, and API URLs in `app.json` and `eas.json`.

## Useful commands

| Command | Purpose |
| --- | --- |
| `npm run start` | Start the Expo development server. |
| `npm run android` | Build and run the Android app locally. |
| `npm run ios` | Build and run the iOS app locally. |
| `npm run web` | Start the web target. |
| `npm run lint` | Check lint rules. |
| `npm run lint:fix` | Apply automatic lint fixes. |
| `npm test` | Run Jest. |

The optional todo hooks need a server that implements `/todos`. If a screen using those hooks cannot load data, check the API URL and device network access. Restart Expo after changing `.env`.
