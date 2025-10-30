import { render } from "preact";
import { lazy, LocationProvider, Route, Router } from "preact-iso";

import "./style.css";
import { NotFound } from "./pages/_404.tsx";

const Home = lazy(() => import("./pages/Home/index.tsx"));
const Login = lazy(() => import("./pages/Login/index.tsx"));
const Dashboard = lazy(() => import("./pages/Dashboard/index.tsx"));
const Learn = lazy(() => import("./pages/Learn/index.tsx"));

export function App() {
  return (
    <LocationProvider>
      {/*<Header />*/}
      <main>
        <Router>
          <Route path="/" component={Home} />
          <Route path="/dashboard" component={Dashboard} />
          <Route path="/login" component={Login} />
          <Route path="/learn/:id" component={Learn} />
          <Route default component={NotFound} />
        </Router>
      </main>
    </LocationProvider>
  );
}

render(<App />, document.getElementById("app")!);
