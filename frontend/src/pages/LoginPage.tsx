import { useState } from "preact/hooks";

type Props = {
  onLogin?: (email: string) => void;
  onGoToDashboard?: () => void; // new prop for navigation
};

const LoginPage = ({ onLogin, onGoToDashboard }: Props) => {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);

  const submit = (e: any) => {
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
    <main
      className="login-page"
      style={{ padding: "2rem", display: "flex", justifyContent: "center" }}
    >
      <div
        className="login-card"
        style={{
          width: "400px",
          padding: "2rem",
          border: "1px solid #ccc",
          borderRadius: "8px",
          boxShadow: "0 4px 8px rgba(0,0,0,0.1)",
        }}
      >
        <h1 style={{ textAlign: "center" }}>🔥Welcome to QuizLit🔥</h1>
        <h2 style={{ textAlign: "center", fontWeight: "normal" }}>
          Please login or create an account
        </h2>

        <form onSubmit={submit} style={{ marginTop: "1.5rem" }}>
          <div style={{ marginBottom: "1rem" }}>
            <label>
              Username
              <input
                type="text"
                value={username}
                onInput={(e: any) => setUsername(e.target.value)}
                style={{
                  display: "block",
                  width: "100%",
                  padding: "0.5rem",
                  marginTop: "0.25rem",
                }}
              />
            </label>
          </div>

          <div style={{ marginBottom: "1rem" }}>
            <label>
              Password
              <input
                type="password"
                value={password}
                onInput={(e: any) => setPassword(e.target.value)}
                style={{
                  display: "block",
                  width: "100%",
                  padding: "0.5rem",
                  marginTop: "0.25rem",
                }}
              />
            </label>
          </div>

          {error && (
            <div style={{ color: "crimson", marginBottom: "1rem" }}>
              {error}
            </div>
          )}

          <div style={{ display: "flex", justifyContent: "space-between" }}>
            <button
              type="submit"
              style={{ padding: "0.5rem 1rem", cursor: "pointer" }}
            >
              Sign In
            </button>
            <button
              type="button"
              onClick={() => alert("Create account flow not implemented")}
              style={{ padding: "0.5rem 1rem", cursor: "pointer" }}
            >
              Create an Account
            </button>
          </div>
        </form>

        {/* Dashboard button */}
        <div style={{ marginTop: "2rem", textAlign: "center" }}>
          <button
            onClick={onGoToDashboard}
            style={{ padding: "0.5rem 1rem", fontSize: "1rem", cursor: "pointer" }}
          >
            Go to Dashboard
          </button>
        </div>
      </div>
    </main>
  );
};

export default LoginPage;
