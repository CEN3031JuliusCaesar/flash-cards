import api from "../client.ts";

export type UserStats = {
  totalCards: number;
  studySets: number;
  streak: number;
  accuracy: number;
  hoursStudied: number;
  cardsToday: number;
};

export const getUserStats = async (): Promise<UserStats> => {
  const response = await api.get("/api/user/stats");
  return response.data;
};
