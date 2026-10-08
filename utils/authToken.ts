/**
 * Tiny in-memory holder for the access token.
 *
 * apiClient can't call React hooks, so it reads the token from here, and
 * AuthContext registers handlers here to hear about refreshes and expiry.
 * This also avoids a circular import between the API client and the context.
 */

type AuthHandlers = {
  onTokenRefreshed?: (token: string) => void;
  onSessionExpired?: () => void;
};

let accessToken: string | null = null;
let handlers: AuthHandlers = {};

export const getAccessToken = () => accessToken;

export const setAccessToken = (token: string | null) => {
  accessToken = token;
};

export const setAuthHandlers = (next: AuthHandlers) => {
  handlers = next;
};

/** Called by apiClient after a successful token refresh. */
export const notifyTokenRefreshed = (token: string) => {
  accessToken = token;
  handlers.onTokenRefreshed?.(token);
};

/** Called by apiClient when the refresh token is rejected. */
export const notifySessionExpired = () => {
  accessToken = null;
  handlers.onSessionExpired?.();
};
