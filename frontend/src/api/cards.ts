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

export type StudyCardParams = {
  result: "correct" | "incorrect";
};

export type StudyCardResponse = {
  cardId: string;
  result: string;
  oldPoints: number;
  newPoints: number;
  lastReviewed: number;
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

export type CreateCardParams = {
  set_id: string;
  front: string;
  back: string;
};

export const createCard = async (
  params: CreateCardParams,
): Promise<Card> => {
  const response = await api.post(`/api/cards/create`, params);
  return response.data;
};

export const studyCard = async (
  cardId: string,
  params: StudyCardParams,
): Promise<StudyCardResponse> => {
  const response = await api.post(`/api/cards/${cardId}/study`, params);
  return response.data;
};
