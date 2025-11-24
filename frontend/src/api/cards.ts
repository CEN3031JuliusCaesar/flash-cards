import api from "./client.ts";

export type Card = {
  id: string;
  set_id: string;
  front: string;
  back: string;
};

export type CardProgress = {
  points: number;
  last_reviewed: number;
};

export const getCardById = async (cardId: string): Promise<Card> => {
  const response = await api.get(`/api/cards/${cardId}`);
  return response.data;
};

export const getCardProgress = async (
  cardId: string,
): Promise<CardProgress> => {
  const response = await api.get(`/api/cards/${cardId}/progress`);
  return response.data;
};
