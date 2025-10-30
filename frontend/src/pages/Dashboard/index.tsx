import { useLocation } from "preact-iso/router";

export default function DashboardPage() {
  const location = useLocation();

  return (
    <main
      style={{
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        height: "100vh",
        gap: "1rem",
      }}
    >
      <h1>Dashboard</h1>
      <button
        type="button"
        style={{ padding: "0.5rem 1rem", fontSize: "1rem", cursor: "pointer" }}
        onClick={() => location.route("/learn/temp")}
      >
        To Flashcard Page
      </button>
      <button
        type="button"
        style={{ padding: "0.5rem 1rem", fontSize: "1rem", cursor: "pointer" }}
        onClick={() => alert("Set page not implemented yet")}
      >
        To Set Page
      </button>
    </main>
  );
}
