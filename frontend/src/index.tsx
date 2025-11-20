import "preact/devtools";

import { render } from "preact";
import { lazy, LocationProvider, Route, Router } from "preact-iso";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";

const queryClient = new QueryClient();

import "./style.css";
import { NotFound } from "./pages/_404.tsx";

const Home = lazy(() => import("./pages/Home/index.tsx"));
const Login = lazy(() => import("./pages/Login/index.tsx"));
const Register = lazy(() => import("./pages/Register/index.tsx"));
const Dashboard = lazy(() => import("./pages/Dashboard/index.tsx"));
const Learn = lazy(() => import("./pages/Learn/index.tsx"));
const Profile = lazy(() => import("./pages/Profile/index.tsx"));

export function App() {
  return (
    <LocationProvider>
      <QueryClientProvider client={queryClient}>
        {/*<Header />*/}
        <main>
          <Router>
            <Route path="/" component={Home} />
            <Route path="/dashboard" component={Dashboard} />
            <Route path="/profile" component={Profile} />
            <Route path="/login" component={Login} />
            <Route path="/register" component={Register} />
            <Route path="/learn/:id" component={Learn} />
            <Route default component={NotFound} />
          </Router>
        </main>
      </QueryClientProvider>
    </LocationProvider>
  );
}

render(<App />, document.getElementById("app")!);
