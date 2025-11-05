import api from "../client.ts";

export type LoginParams = {
  username: string;
  password: string;
};

export const login = async (credentials: LoginParams) => {
  if (credentials.username == "") throw new Error("Username is empty.");
  if (credentials.password == "") throw new Error("Password is empty.");

  try {
    const res = await api.post("/api/user/auth/login", credentials);
    return res.data;
  } catch (_: unknown) {
    throw new Error("Invalid Credentials");
  }
};

export type RegisterParams = {
  username: string;
  password: string;
  email: string;
};

export const register = async (credentials: RegisterParams) => {
  const res = await api.post("/api/user/auth/register", credentials);
  return res.data;
};

export const logout = async () => {
  const res = await api.post("/api/user/auth/logout");
  return res.data;
};
