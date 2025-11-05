import api from "../client.ts";

export type Streak = {
  current_streak: number;
};

export const getCurrentStreak = async (): Promise<Streak[]> => {
  const response = await api.get("/api/user/streaks");
  return response.data;
};

export const updateStreak = async (): Promise<[]> => {
  const response = await api.post("/api/user/streaks/update");
  return response.data;
};
