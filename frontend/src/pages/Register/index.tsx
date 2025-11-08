import "../Login/style.css";

import { register, RegisterParams } from "../../api/user/auth.ts";
import { useState } from "preact/hooks";
import { useMutation } from "@tanstack/react-query";
import { useLocation } from "preact-iso/router";

export default function Register() {
  const [email, setEmail] = useState("");
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const location = useLocation();

  const { mutate, isPending, isError, error } = useMutation({
    mutationFn: (creds: RegisterParams) => register(creds),
    onSuccess: () => {
      location.route("/login");
    },
  });

  const submit = (e: SubmitEvent) => {
    e.preventDefault();

    mutate({ username, password, email });
  };

  return (
    <main class="login-page">
      <div class="login-card">
        <h1>🔥Welcome to QuizLit🔥</h1>
        <h2>Please create an account</h2>

        <form onSubmit={submit}>
          <div>
            <label>
              Email
              <input
                type="text"
                value={email}
                onInput={(e: InputEvent) =>
                  setEmail((e.target as HTMLInputElement).value)}
              />
            </label>
          </div>

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
              Create Account
            </button>
          </div>
        </form>

        {/* Dashboard button */}
        <div class="dashboard-button">
          <button type="button" onClick={() => location.route("/dashboard")}>
            Back to Dashboard
          </button>
        </div>
        <div class="login-button">
          <button type="button" onClick={() => location.route("/login")}>
            Or Log In
          </button>
        </div>
      </div>
    </main>
  );
}
