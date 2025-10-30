import "./style.css";
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
    <main className="login-page">
      <div className="login-card">
        <h1>🔥Welcome to QuizLit🔥</h1>
        <h2>Please login or create an account</h2>

        <form onSubmit={submit}>
          <div>
            <label>
              Username
              <input
                type="text"
                value={username}
                onInput={(e: any) => setUsername(e.target.value)}
              />
            </label>
          </div>

          <div>
            <label>
              Password
              <input
                type="password"
                value={password}
                onInput={(e: any) => setPassword(e.target.value)}
              />
            </label>
          </div>

          {error && <div className="error-message">{error}</div>}

          <div className="button-group">
            <button type="submit">Sign In</button>
            <button
              type="button"
              onClick={() => alert("Create account flow not implemented")}
            >
              Create an Account
            </button>
          </div>
        </form>

        {/* Dashboard button */}
        <div className="dashboard-button">
          <button onClick={onGoToDashboard}>Go to Dashboard</button>
        </div>
      </div>
    </main>
  );
};

export default LoginPage;
