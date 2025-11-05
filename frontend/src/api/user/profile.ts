import api from "../client.ts";

export type UserProfile = {
  pic_id: number;
  description: string | null;
};

export type UpdateProfileParams = {
  pic_id?: number;
  description?: string;
};

export const getUserProfile = async (
  username: string,
): Promise<UserProfile> => {
  const response = await api.get(`/api/user/profile/${username}`);
  return response.data;
};

export const updateUserProfile = async (
  username: string,
  params: UpdateProfileParams,
): Promise<{ message: string }> => {
  const response = await api.patch(`/api/user/profile/${username}`, params);
  return response.data;
};
