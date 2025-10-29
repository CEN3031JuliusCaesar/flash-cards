import { render } from "preact";
import { LocationProvider, Route, Router } from "preact-iso";

import { Header } from "./components/Header.tsx";
import { Home } from "./pages/Home/index.tsx";
import { NotFound } from "./pages/_404.tsx";
import "./style.css";
import LoginPage from "./pages/LoginPage.js";

export function App() {
  return (
    <LocationProvider>
      <Header />
      <main>
        <Router>
          <Route path="/" component={Home} />
          <Route path="/login" component={LoginPage} />
          <Route default component={NotFound} />
        </Router>
      </main>
    </LocationProvider>
  );
}

render(<App />, document.getElementById("app"));
