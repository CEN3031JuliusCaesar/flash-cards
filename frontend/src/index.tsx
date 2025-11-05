import "preact/devtools";

import { render } from "preact";
import { lazy, LocationProvider, Route, Router } from "preact-iso";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";

const queryClient = new QueryClient();

import "./style.css";
import { NotFound } from "./pages/_404.tsx";
import "./style.css";
import LoginPage from "./pages/LoginPage.js";
import DashboardPage from "./pages/DashboardPage.tsx";
import StudyPage from "./pages/StudyPage.tsx";
import StudySetsPage from "./pages/StudySetsPage.tsx";
import ProfilePage from "./pages/ProfilePage.tsx";

export function App() {
  return (
    <LocationProvider>
      <Header />
      <main>
        <Router>
          <Route path="/" component={Home} />
          <Route path="/login" component={LoginPage} />
          <Route path="/dashboard" component={DashboardPage} />
          <Route path="/study" component={StudyPage} />
          <Route path="/studysets" component={StudySetsPage} />
          <Route path="/profile" component={ProfilePage} />
          <Route default component={NotFound} />
        </Router>
      </main>
    </LocationProvider>
  );
}

render(<App />, document.getElementById("app")!);
