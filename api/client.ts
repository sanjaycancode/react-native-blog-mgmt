import axios, { AxiosError } from "axios";

import { env } from "@/lib/config/env";

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

// Reserved for auth token injection when auth is implemented:
// apiClient.interceptors.request.use(async (config) => {
//   const token = await getAsyncStorageItem<string>("auth_access_token");
//   if (token) config.headers.Authorization = `Bearer ${token}`;
//   return config;
// });

apiClient.interceptors.response.use(
  (response) => response,
  (error: unknown) => Promise.reject(normalizeApiError(error)),
);
