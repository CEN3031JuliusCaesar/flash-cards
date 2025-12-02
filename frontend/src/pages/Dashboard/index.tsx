import "./style.css";
import { useLocation } from "preact-iso/router";
import { useEffect, useState } from "preact/hooks";
import { Search } from "../../components/Search.tsx";
import { useAuthRedirect } from "../../utils/cookies.ts";
import { useQuery } from "@tanstack/react-query";
import { getCurrentStreak } from "../../api/user/streak.ts";

export default function DashboardPage() {
  const location = useLocation();

  const { username, isLoading: authLoading } = useAuthRedirect(false);

  const { data: streak } = useQuery({
    queryKey: ["streak", username],
    queryFn: getCurrentStreak,
    enabled: Boolean(username),
  });

  const navigationCards = [
    {
      title: "Study Session",
      description: "Start learning with flashcards",
      icon: "🎯",
      path: "/learn/tracked",
      colorClass: "card-green",
      enabled: true,
      stats: "",
    },
    {
      title: "Study Sets",
      description: "Manage your flashcard collections",
      icon: "📚",
      path: "/studysets",
      colorClass: "card-blue",
      enabled: true,
      stats: "",
    },
    {
      title: "Progress",
      description: "View your learning analytics",
      icon: "📊",
      path: "/progress",
      colorClass: "card-orange",
      enabled: true,
      stats: "",
    },
    {
      title: "Profile",
      description: "Account settings and preferences",
      icon: "👤",
      path: (!authLoading && username ? "/user/" + username : "/login"),
      colorClass: "card-purple",
      enabled: true,
      stats: "",
    },
  ];

  return (
    <>
      {/* Welcome Section at the top */}
      <div class="welcome-header">
        <h1>
          {((streak?.current_streak ?? 0) > 0)
            ? "Welcome back"
            : "Welcome to QuizLit"}! 👋
        </h1>
      </div>

      <Search class="small"></Search>

      {/* Quick Stats Section */}
      <div class="stats-section">
        <div class="stat-item">
          <span class="stat-number">{streak?.current_streak ?? 0}</span>
          <span class="stat-label">Day Streak</span>
        </div>
      </div>

      <div class="dashboard-content">
        {/* Navigation Section */}
        <section class="navigation-section">
          <h2>Quick Actions</h2>
          <div class="nav-grid">
            {navigationCards.map((card, index) => (
              <button
                type="button"
                key={index}
                class={`nav-card ${card.colorClass}`}
                onClick={() => location.route(card.path)}
                disabled={!card.enabled}
              >
                <div class="nav-card-header">
                  <span class="nav-icon">{card.icon}</span>
                  <span class="nav-stats">{card.stats}</span>
                </div>
                <h3>{card.title}</h3>
                <p>{card.description}</p>
                <div class="nav-arrow">→</div>
              </button>
            ))}
          </div>
        </section>
      </div>
    </>
  );
}
