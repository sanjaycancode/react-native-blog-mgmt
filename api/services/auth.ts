import { apiClient } from "../client";
import { LoginPayload, RegisterPayload } from "@/types";

export interface AuthUser {
  id: string;
  name: string;
  email: string;
  role: string;
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

export const authApi = {
  /** Creates the account and emails a verification link. Returns 201 with a message only. */
  register: (data: RegisterPayload) =>
    apiClient.post<MessageResponse>("/auth/register", data),

  /** Verifies the email using the token from the verification link. */
  verifyEmail: (data: VerifyEmailPayload) =>
    apiClient.post<MessageResponse>("/auth/verify-email", data),

  /**
   * Returns the access token and user. The server also sets the httpOnly
   * `refreshToken` cookie, so credentials must be sent with the request.
   */
  login: (data: LoginPayload) =>
    apiClient.post<LoginResponse>("/auth/login", data, {
      withCredentials: true,
    }),

  /** Requires the `Authorization: Bearer <token>` header. */
  me: () => apiClient.get<CurrentUserResponse>("/auth/me"),

  /** Always responds 200 with a generic message, whether or not the email exists. */
  forgotPassword: (data: ForgotPasswordPayload) =>
    apiClient.post<MessageResponse>("/auth/forgot-password", data),

  resetPassword: (data: ResetPasswordPayload) =>
    apiClient.post<MessageResponse>("/auth/reset-password", data),

  /** Uses the `refreshToken` cookie to get a new access token. */
  refresh: () =>
    apiClient.post<RefreshResponse>("/auth/refresh", undefined, {
      withCredentials: true,
    }),
};
