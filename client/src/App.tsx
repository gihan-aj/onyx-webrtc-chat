import SignUp from "./components/SignUp";
import "./App.css"; // Keep the basic styling
import type React from "react";
import Login from "./components/Login";

const App: React.FC = () => {
  return (
    <div className="App">
      <header className="App-header">
        <h1>Welcome to OnyxChat</h1>
        <div style={{ display: "flex", gap: "50px" }}>
          <SignUp />
          <Login /> {/* Added Login component */}
        </div>
      </header>
    </div>
  );
}

export default App;
