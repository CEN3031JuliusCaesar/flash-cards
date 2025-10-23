import { useState } from "preact/hooks";

type Props = {
  onLogin?: (email: string) => void;
};

const LoginPage = ({ onLogin }: Props) => {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);

  const submit = (e: Event) => {
    e.preventDefault();
    setError(null);
    if (!username) return setError("Username is required");
    if (!password) return setError("Password is required");

    // Mock login action
    console.log("Logging in", { username });
    if (onLogin) onLogin(username);
    else alert(`Logged in as ${username}`);
  };

  return (
    <main className="login-page">
      <div className="login-card">
        <h1 style={{ width: "100%" }}>🔥Welcome to QuizLit🔥</h1>
        <h2>Please login or create an account</h2>

        <form className="login-form" onSubmit={submit}>
          <div>
            <label>
              Username
              <input
                type="text"
                value={username}
                onInput={(e: any) => setUsername(e.target.value)}
                style={{ display: "block", width: "100%", padding: "0.5rem" }}
              />
            </label>
          </div>

          <div style={{ marginBottom: "1.0rem" }}>
            <label>
              Password
              <input
                type="password"
                value={password}
                onInput={(e: any) => setPassword(e.target.value)}
                style={{ display: "block", width: "100%", padding: "0.5rem" }}
              />
            </label>
          </div>

          {error && (
            <div style={{ color: "crimson", marginBottom: "1.0rem" }}>
              {error}
            </div>
          )}

          <div className="form-actions">
            <button type="submit" style={{ padding: "0.5rem 1.0rem" }}>
              Sign In
            </button>
            <button
              type="button"
              onClick={() => alert("Create account flow not implemented")}
              style={{ padding: "0.5rem 1rem" }}
            >
              Create an Account
            </button>
          </div>
        </form>
      </div>
    </main>
  );
};

export default LoginPage;
