import { apiClient } from "@/api/client";

import type { CreateTodoPayload, Todo, UpdateTodoPayload } from "@/types";

// Example domain — delete or replace with your own domain.
// Demonstrates: typed generics, return response.data, no try/catch.
export async function getTodos(): Promise<Todo[]> {
  const response = await apiClient.get<Todo[]>("/todos");
  return response.data;
}

export async function getTodoById(id: number): Promise<Todo> {
  const response = await apiClient.get<Todo>(`/todos/${id}`);
  return response.data;
}

export async function createTodo(payload: CreateTodoPayload): Promise<Todo> {
  const response = await apiClient.post<Todo>("/todos", payload);
  return response.data;
}

export async function updateTodo(
  id: number,
  payload: UpdateTodoPayload,
): Promise<Todo> {
  const response = await apiClient.put<Todo>(`/todos/${id}`, payload);
  return response.data;
}

export async function deleteTodo(id: number): Promise<void> {
  await apiClient.delete(`/todos/${id}`);
}
