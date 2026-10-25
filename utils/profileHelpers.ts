import { getErrorMessage } from "@/utils/errorMessage";

export function getStatusCode(error: unknown): number | undefined {
  return (error as { response?: { status?: number } })?.response?.status;
}

export function isProfileMissing(error: unknown): boolean {
  return (
    getStatusCode(error) === 400 ||
    getErrorMessage(error).toLowerCase().includes("doesn't exist")
  );
}

export function getExternalHref(value: string) {
  return /^https?:\/\//i.test(value) ? value : `https://${value}`;
}

export function getOwnerId(value: { _id?: string; id?: string } | undefined) {
  return value?._id ?? value?.id;
}
