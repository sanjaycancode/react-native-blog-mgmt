/** Single source of truth for the authenticated user. */
export interface AuthUser {
  id: string;
  name: string;
  email: string;
  role: string;
}

/** @deprecated Use `AuthUser`. Kept so existing imports don't break. */
export type AuthenticatedUser = AuthUser;

/* ---------- Request payloads ---------- */

export interface LoginPayload {
  email: string;
  password: string;
}

export interface RegisterPayload {
  name: string;
  email: string;
  password: string;
}

export interface VerifyEmailPayload {
  token: string;
}

export interface ForgotPasswordPayload {
  email: string;
}

export interface ResetPasswordPayload {
  email: string;
  token: string;
  password: string;
}

/* ---------- Responses ---------- */

export interface MessageResponse {
  message: string;
}

export interface LoginResponse extends MessageResponse {
  payload: AuthUser;
  /** Short-lived access token (1 minute). */
  token: string;
}

export interface RefreshResponse {
  token: string;
}

export interface CurrentUserResponse extends MessageResponse {
  user: AuthUser;
}
