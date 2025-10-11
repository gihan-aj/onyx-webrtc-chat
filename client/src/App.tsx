import SignUp from "./components/SignUp";
import "./App.css"; // Keep the basic styling
import type React from "react";
import Login from "./components/Login";
import { useState } from "react";
import Chat from "./components/Chat";

const App: React.FC = () => {
  const [idToken, setIdToken] = useState<string | null>(null);

  const handleLoginSuccess = (token: string) => {
    setIdToken(token);
  };

  return (
    <div className="App">
      <header className="App-header">
        <h1>Welcome to OnyxChat</h1>

        {/* Conditional rendering: Show chat if we have a token, otherwise show auth forms */}
        {idToken ? (
          <Chat token={idToken} />
        ) : (
          <div style={{ display: "flex", gap: "50px" }}>
            <SignUp />
            <Login onLoginSuccess={handleLoginSuccess}/> {/* Added Login component */}
          </div>
        )}
      </header>
    </div>
  );
};

export default App;
