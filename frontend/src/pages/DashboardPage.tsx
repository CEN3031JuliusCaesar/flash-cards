
import { useLocation } from "preact-iso";

const DashboardPage = () => {
  const { route } = useLocation();

  const navigationCards = [
    {
      title: "Study Session",
      description: "Start studying your flashcards",
      icon: "📚",
      path: "/study",
      color: "#4CAF50"
    },
    {
      title: "Study Sets",
      description: "Manage your flashcard collections",
      icon: "📝",
      path: "/studysets",
      color: "#2196F3"
    },
    {
      title: "Profile",
      description: "View your progress and settings",
      icon: "👤",
      path: "/profile",
      color: "#FF9800"
    }
  ];

  const handleNavigation = (path: string) => {
    route(path);
  };

  return (
    <div className="dashboard-container">
      <div className="dashboard-header">
        <h1>Welcome to Your Dashboard</h1>
        <p>Choose an option to get started with your flashcard learning</p>
      </div>

      <div className="navigation-grid">
        {navigationCards.map((card, index) => (
          <button
            key={index}
            className="nav-card"
            onClick={() => handleNavigation(card.path)}
            style={{ borderLeft: `4px solid ${card.color}` }}
          >
            <div className="nav-card-icon">{card.icon}</div>
            <div className="nav-card-content">
              <h3>{card.title}</h3>
              <p>{card.description}</p>
            </div>
            <div className="nav-card-arrow">→</div>
          </button>
        ))}
      </div>

      <div className="dashboard-stats">
        <div className="stat-card">
          <h4>Study Streak</h4>
          <span className="stat-number">7 days</span>
        </div>
        <div className="stat-card">
          <h4>Cards Studied</h4>
          <span className="stat-number">142</span>
        </div>
        <div className="stat-card">
          <h4>Study Sets</h4>
          <span className="stat-number">5</span>
        </div>
      </div>
    </div>
  );
};

export default DashboardPage;