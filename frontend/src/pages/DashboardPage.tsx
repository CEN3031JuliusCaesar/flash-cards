import { FunctionalComponent } from "preact";

type Props = {
  onButton1Click?: () => void;
  onButton2Click?: () => void;
};

const DashboardPage: FunctionalComponent<Props> = ({ onButton1Click, onButton2Click }) => {
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
        style={{ padding: "0.5rem 1rem", fontSize: "1rem", cursor: "pointer" }}
        onClick={onButton1Click}
      >
        To Flashcard Page
      </button>
      <button
        style={{ padding: "0.5rem 1rem", fontSize: "1rem", cursor: "pointer" }}
        onClick={onButton2Click}
      >
        To Set Page
      </button>
    </main>
  );
};

export default DashboardPage;
