import api from "../client.ts";

export type UserProfile = {
  username: string;
  email: string;
  name: string;
  bio: string | null;
  pic_id: number;
  joinDate: string;
};

export type UpdateProfileParams = {
  name?: string;
  email?: string;
  bio?: string;
  pic_id?: number;
};

export const getUserProfile = async (): Promise<UserProfile> => {
  const response = await api.get("/api/user/profile");
  return response.data;
};

export const updateUserProfile = async (
  params: UpdateProfileParams,
): Promise<{ message: string }> => {
  const response = await api.patch("/api/user/profile", params);
  return response.data;
};
