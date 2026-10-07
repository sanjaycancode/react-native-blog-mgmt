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
  username: string;
  password: string;
}
