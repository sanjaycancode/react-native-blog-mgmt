import axios, { AxiosError, InternalAxiosRequestConfig } from "axios";

import { env } from "@/lib/config/env";
import {
  getAccessToken,
  notifySessionExpired,
  notifyTokenRefreshed,
} from "@/utils/authToken";
export interface ApiError {
  message: string;
  statusCode?: number;
  code?: string;
  details?: unknown;
  transportCode?: string;
  kind?: "timeout" | "network" | "cancelled" | "http" | "unknown";
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

export function normalizeApiError(error: unknown): ApiError {
  if (axios.isAxiosError(error)) {
    const axiosError = error as AxiosError<{ message?: unknown }>;
    const statusCode = axiosError.response?.status;
    const data = axiosError.response?.data;
    let message: string | undefined;

    if (isRecord(data) && typeof data.message === "string") {
      message = data.message;
    }

    message ??=
      statusCode === 401
        ? "Invalid username or password."
        : statusCode === 404
          ? "Not found."
          : statusCode === 500
            ? "Server error. Please try again."
            : (axiosError.message ??
              "Something went wrong while communicating with the server.");

    return {
      message,
      statusCode,
      transportCode: axiosError.code,
      kind:
        axiosError.code === "ECONNABORTED"
          ? "timeout"
          : axiosError.code === "ERR_CANCELED"
            ? "cancelled"
            : axiosError.response
              ? "http"
              : "network",
    };
  }

  if (error instanceof Error) {
    return { message: error.message };
  }

  return { message: "Unexpected error occurred." };
}

export const apiClient = axios.create({
  baseURL: env.apiBaseUrl,
  timeout: 15000,
  headers: {
    "Content-Type": "application/json",
    Accept: "application/json",
  },
});

apiClient.interceptors.request.use((config) => {
  const token = getAccessToken();
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

type RetryableConfig = InternalAxiosRequestConfig & { _retry?: boolean };

let refreshPromise: Promise<string> | null = null;

/**
 * Uses plain axios (not apiClient) so a failed refresh can't loop through
 * the interceptors. One refresh at a time, even if several requests fail together.
 */
function refreshAccessToken(): Promise<string> {
  refreshPromise ??= axios
    .post<{ token: string }>(`${env.apiBaseUrl}/auth/refresh`, undefined, {
      withCredentials: true,
      timeout: 15000,
    })
    .then((response) => response.data.token)
    .finally(() => {
      refreshPromise = null;
    });

  return refreshPromise;
}
apiClient.interceptors.response.use(
  (response) => response,
  async (error: unknown) => {
    if (axios.isAxiosError(error)) {
      const original = error.config as RetryableConfig | undefined;
      const url = original?.url ?? "";
      const isAuthCall =
        url.includes("/auth/login") || url.includes("/auth/refresh");

      // Expired access token: refresh once, then retry the original request.
      if (
        error.response?.status === 401 &&
        original &&
        !original._retry &&
        !isAuthCall &&
        getAccessToken()
      ) {
        original._retry = true;

        let token: string;
        try {
          token = await refreshAccessToken();
        } catch (refreshError) {
          // Only end the session if the server actually rejected the refresh,
          // not when the phone is just offline.
          if (axios.isAxiosError(refreshError) && refreshError.response) {
            notifySessionExpired();
          }
          return Promise.reject(normalizeApiError(error));
        }

        notifyTokenRefreshed(token);
        original.headers.Authorization = `Bearer ${token}`;
        return apiClient(original);
      }
    }

    return Promise.reject(normalizeApiError(error));
  },
);
