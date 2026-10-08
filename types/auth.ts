export interface AuthenticatedUser {
  id: string;
  username: string;
  email?: string;
}

export interface AuthResponse {
  user: AuthenticatedUser;
  token: string;
}

export interface LoginPayload {
  email: string;
  password: string;
}

export interface RegisterPayload {
  name: string;
  email: string;
  password: string;
}
