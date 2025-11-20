import api from "./client.ts";

export type Set = {
  id: string;
  owner: string;
  title: string;
  cards?: {
    id: string;
    set_id: string;
    front: string;
    back: string;
  }[];
};

export type CreateSetParams = {
  title: string;
};

export const createSet = async (params: CreateSetParams): Promise<Set> => {
  const response = await api.post("/api/sets/create", params);
  return response.data;
};

export const deleteSet = async (setId: string): Promise<{ id: string }> => {
  const response = await api.delete(`/api/sets/${setId}`);
  return response.data;
};

export type UpdateSetParams = {
  newOwner?: string;
  newTitle?: string;
};

export const updateSet = async (
  setId: string,
  params: UpdateSetParams,
): Promise<Set> => {
  const response = await api.patch(`/api/sets/${setId}`, params);
  return response.data;
};

export const getTrackedSets = async (
  study?: string,
): Promise<Set> => {
  let url = "/api/sets/tracked";
  if (study !== undefined) {
    url += `?study=${study}`;
  }
  const response = await api.get(url);
  return response.data;
};

export const getSetById = async (
  setId: string,
  study?: string,
): Promise<Set> => {
  let url = `/api/sets/${setId}`;
  if (study !== undefined) {
    url += `?study=${study}`;
  }
  const response = await api.get(url);
  return response.data;
};

export const trackSet = async (setId: string): Promise<{ message: string }> => {
  const response = await api.post(`/api/sets/${setId}/track`);
  return response.data;
};

export const untrackSet = async (
  setId: string,
): Promise<{ message: string }> => {
  const response = await api.delete(`/api/sets/${setId}/untrack`);
  return response.data;
};

export const getSetTrackedStatus = async (
  setId: string,
): Promise<{ isTracked: boolean }> => {
  const response = await api.get(`/api/sets/${setId}/tracked`);
  return response.data;
};
