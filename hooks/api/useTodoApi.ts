import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import {
  createTodo,
  deleteTodo,
  getTodoById,
  getTodos,
  updateTodo,
} from "@/api/services";

import type { CreateTodoPayload, Todo, UpdateTodoPayload } from "@/types";

export type { Todo };

export const todoKeys = {
  all: ["todos"] as const,
  detail: (id: number) => ["todos", id] as const,
};

interface UpdateTodoInput {
  id: number;
  payload: UpdateTodoPayload;
}

export function useTodosQuery() {
  return useQuery({
    queryKey: todoKeys.all,
    queryFn: getTodos,
  });
}

export function useTodoQuery(id: number) {
  return useQuery({
    queryKey: todoKeys.detail(id),
    queryFn: () => getTodoById(id),
    enabled: id > 0,
  });
}

export function useCreateTodoMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (payload: CreateTodoPayload) => createTodo(payload),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: todoKeys.all });
    },
  });
}

export function useUpdateTodoMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, payload }: UpdateTodoInput) => updateTodo(id, payload),
    onSuccess: async (todo, { id }) => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: todoKeys.detail(id) }),
        queryClient.invalidateQueries({ queryKey: todoKeys.all }),
      ]);

      return todo;
    },
  });
}

export function useDeleteTodoMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: number) => deleteTodo(id),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: todoKeys.all });
    },
  });
}
