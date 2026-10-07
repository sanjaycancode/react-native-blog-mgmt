import { useMutation, useQueryClient } from "@tanstack/react-query";

import type { AuthResponse, LoginPayload } from "@/types";

// Stub auth API hook — replace `fakeLogin` with your real auth service
// (e.g. `login` from `@/api/services/authService`) when backend is ready.
async function fakeLogin(payload: LoginPayload): Promise<AuthResponse> {
  return {
    user: { id: "demo-user", username: payload.username },
    token: "demo-token",
  };
}

export function useLoginMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (payload: LoginPayload) => fakeLogin(payload),
    onSuccess: async () => {
      await queryClient.clear();
    },
  });
}
