import api from "./client.ts";

export type Set = {
  id: string;
  name: string;
  description: string;
};


export const getSetById = async (setId: string): Promise<Set[]> => {
  const response = await api.get(`/api/sets/${setId}`);
  return response.data;
};

export const getAllSets = async (): Promise<Set[]> => {
  const response = await api.get("/api/sets");
  return response.data;
};

export const createSet = async (
  name: string,
  description: string,
): Promise<Set[]> => {
  const response = await api.post("/api/sets", { name, description });
  return response.data;
};

export const updateSet = async (
  setId: string,
  newOwner?: string,
  newTitle?: string,
): Promise<Set[]> => {
  const response = await api.patch(`/api/sets/${setId}`, { newOwner, newTitle });
  return response.data;
};

export const deleteSet = async (setId: string): Promise<{ id: string }> => {
  const response = await api.delete(`/api/sets/${setId}`);
  return response.data;
};