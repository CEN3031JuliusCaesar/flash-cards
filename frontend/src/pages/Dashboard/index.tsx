import "./style.css";
import { useLocation } from "preact-iso/router";

export default function DashboardPage() {
  const location = useLocation();

  return (
    <main class="dashboard">
      <h1>Dashboard</h1>
      <button type="button" onClick={() => location.route("/learn/temp")}>
        To Flashcard Page
      </button>
      <button
        type="button"
        onClick={() => alert("Set page not implemented yet")}
      >
        To Set Page
      </button>
      <button type="button" onClick={() => location.route("/login")}>
        To Login Page
      </button>
    </main>
  );
}
