import "./style.css";
import { useLocation } from "preact-iso/router";
import { useEffect, useState } from "preact/hooks";

export default function DashboardPage() {
  const location = useLocation();
  const [currentTime, setCurrentTime] = useState(new Date());

  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  const navigationCards = [
    {
      title: "Study Session",
      description: "Start learning with flashcards",
      icon: "🎯",
      path: "/learn/temp",
      colorClass: "card-green",
      stats: "12 cards ready",
    },
    {
      title: "Study Sets",
      description: "Manage your flashcard collections",
      icon: "📚",
      path: "/studysets",
      colorClass: "card-blue",
      stats: "5 active sets",
    },
    {
      title: "Progress",
      description: "View your learning analytics",
      icon: "📊",
      path: "/progress",
      colorClass: "card-orange",
      stats: "85% accuracy",
    },
    {
      title: "Profile",
      description: "Account settings and preferences",
      icon: "👤",
      path: "/profile",
      colorClass: "card-purple",
      stats: "Level 3",
    },
  ];

  const recentActivity = [
    {
      action: "Completed",
      subject: "Spanish Vocabulary",
      time: "2 hours ago",
      score: "92%",
    },
    {
      action: "Created",
      subject: "History Terms",
      time: "1 day ago",
      score: "New",
    },
    {
      action: "Studied",
      subject: "Math Formulas",
      time: "2 days ago",
      score: "78%",
    },
  ];

  const todayStats = {
    cardsStudied: 47,
    timeSpent: "1h 23m",
    streak: 7,
    accuracy: 89,
  };

  return (
    <>
      {/* Welcome Section at the top */}
      <div class="welcome-header">
        <h1>Welcome back! 👋</h1>
        <p class="current-time">{currentTime.toLocaleString()}</p>
      </div>

      {/* Quick Stats Section */}
      <div class="stats-section">
        <div class="stat-item">
          <span class="stat-number">{todayStats.streak}</span>
          <span class="stat-label">Day Streak</span>
        </div>
        <div class="stat-item">
          <span class="stat-number">{todayStats.cardsStudied}</span>
          <span class="stat-label">Cards Today</span>
        </div>
        <div class="stat-item">
          <span class="stat-number">{todayStats.accuracy}%</span>
          <span class="stat-label">Accuracy</span>
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

        {/* Progress and Activity Grid */}
        <div class="dashboard-grid">
          <section class="today-progress">
            <h3>Today's Progress</h3>
            <div class="progress-stats">
              <div class="progress-details">
                <div class="detail-item">
                  <span class="detail-label">Time Spent</span>
                  <span class="detail-value">{todayStats.timeSpent}</span>
                </div>
                <div class="detail-item">
                  <span class="detail-label">Cards Studied</span>
                  <span class="detail-value">{todayStats.cardsStudied}</span>
                </div>
                <div class="detail-item">
                  <span class="detail-label">Current Streak</span>
                  <span class="detail-value">{todayStats.streak} days</span>
                </div>
              </div>
            </div>
          </section>

          <section class="recent-activity">
            <h3>Recent Activity</h3>
            <div class="activity-list">
              {recentActivity.map((activity, index) => (
                <div key={index} class="activity-item">
                  <div class="activity-info">
                    <span class="activity-action">{activity.action}</span>
                    <span class="activity-subject">{activity.subject}</span>
                  </div>
                  <div class="activity-meta">
                    <span class="activity-score">{activity.score}</span>
                    <span class="activity-time">{activity.time}</span>
                  </div>
                </div>
              ))}
            </div>
          </section>
        </div>
      </div>
    </>
  );
}
