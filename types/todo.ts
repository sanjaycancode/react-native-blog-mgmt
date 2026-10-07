export interface Todo {
  userId: number;
  id: number;
  title: string;
  completed: boolean;
}

export interface CreateTodoPayload {
  userId: number;
  title: string;
  completed: boolean;
}

export interface UpdateTodoPayload {
  title?: string;
  completed?: boolean;
}
