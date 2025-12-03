import api from "../client.ts";

export type UserProfile = {
  pic_id: number;
  description: string | null;
  is_admin: boolean;
};

export type UpdateProfileParams = {
  pic_id?: number;
  description?: string;
};

export type CurrentUserInfo = {
  username: string;
  is_admin: boolean;
};

export const getCurrentUser = async (): Promise<CurrentUserInfo> => {
  const response = await api.get(`/api/user/profile/me`);
  return response.data;
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

export type UpdateUserAdminStatusParams = {
  is_admin: boolean;
};

export const deleteUserProfile = async (
  username: string,
): Promise<{ message: string }> => {
  const response = await api.delete(`/api/user/profile/${username}`);
  return response.data;
};

export const updateUserAdminStatus = async (
  username: string,
  params: UpdateUserAdminStatusParams,
): Promise<{ message: string }> => {
  const response = await api.put(`/api/user/profile/admin/${username}`, params);
  return response.data;
};

export type UserProfileWithAdmin = {
  pic_id: number;
  description: string | null;
  is_admin: boolean;
};
