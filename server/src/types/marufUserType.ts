export type User = {
  id: number;
  username: string;
  email: string;
  password: string;
  role: 'user' | 'admin';
  created_at: Date;
  updated_at: Date;
};

export type SafeUser = Omit<User, "password">;

export type JwtPayload = {
  id: number;
  username: string;
  email: string;
  role: string;
};
