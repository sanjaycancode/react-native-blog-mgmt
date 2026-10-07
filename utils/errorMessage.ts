/**
 * Extracts a user-friendly error message from an unknown error object.
 * @param error The error object to extract the message from.
 * @returns A string containing the error message.
 */
export function getErrorMessage(error: unknown): string {
  if (typeof error === "object" && error !== null && "message" in error) {
    const { message } = error as { message?: unknown };
    if (typeof message === "string") {
      return message;
    }
  }

  return "Something went wrong.";
}
