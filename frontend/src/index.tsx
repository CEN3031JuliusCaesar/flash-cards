import { render } from 'preact';
import { useState } from 'preact/hooks';

import LoginPage from './pages/LoginPage';
import DashboardPage from "./pages/DashboardPage";
import FlashCardPage from './pages/FlashCardPage';

import './style.css';


const App = () => {
  // State to track which page to show
  const [currentPage, setCurrentPage] = useState<"login" | "dashboard" | "flashcards">("login");

  // Render based on current page
  switch (currentPage) {
    case "login":
      return (
        <LoginPage onGoToDashboard={() => setCurrentPage("dashboard")} />
      );
    case "dashboard":
      return (
        <DashboardPage
          onButton1Click={() => setCurrentPage("flashcards")} // Navigate to FlashCardPage
          onButton2Click={() => alert("Set page not implemented yet")} // Throw alert
        />
      );
    case "flashcards":
      return <FlashCardPage onGoBack={() => setCurrentPage("dashboard")} />;
    default:
      return <div>Page not found</div>;
  }
};

render(<App />, document.getElementById("app")!);

// render(<LoginPage />, document.getElementById('app')!);
// render(<DashboardPage />, document.getElementById('app')!);
// render(<FlashCardPage />, document.getElementById('app')!);