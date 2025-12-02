import api from "../client.ts";

export type Streak = {
  current_streak: number;
};

export const getCurrentStreak = async (): Promise<Streak> => {
  const response = await api.get("/api/user/streaks");
  return response.data;
};
