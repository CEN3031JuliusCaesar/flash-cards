import "./style.css";
import { login, type LoginParams } from "../../api/user/auth.ts";
import { useState } from "preact/hooks";
import { useMutation } from "@tanstack/react-query";
import { useLocation } from "preact-iso/router";

export default function Login() {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const location = useLocation();

  const { mutate, isPending, isError, error } = useMutation({
    mutationFn: (creds: LoginParams) => login(creds),
    onSuccess: () => {
      if ("redirectTo" in location.query) {
        location.route(decodeURIComponent(location.query.redirectTo));
      } else {
        location.route("/");
      }
    },
  });

  const submit = (e: SubmitEvent) => {
    e.preventDefault();

    mutate({ username, password });
  };

  return (
    <main class="login-page">
      <div class="login-card">
        <h1>🔥Welcome to QuizLit🔥</h1>
        <h2>Please login</h2>

        <form onSubmit={submit}>
          <div>
            <label>
              Username
              <input
                type="text"
                value={username}
                onInput={(e: InputEvent) =>
                  setUsername((e.target as HTMLInputElement).value)}
              />
            </label>
          </div>

          <div>
            <label>
              Password
              <input
                type="password"
                value={password}
                onInput={(e: InputEvent) =>
                  setPassword((e.target as HTMLInputElement).value)}
              />
            </label>
          </div>

          {isError && <div class="error-message">{error.message}</div>}

          <div class="button-group">
            <button type="submit" disabled={isPending}>
              Sign In
            </button>
          </div>
        </form>

        <div class="dashboard-button">
          <button type="button" onClick={() => location.route("/")}>
            Back to Dashboard
          </button>
        </div>
        <div class="register-button">
          <button type="button" onClick={() => location.route("/register")}>
            Or Register
          </button>
        </div>
      </div>
    </main>
  );
}
