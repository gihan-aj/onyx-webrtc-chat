import SignUp from "./components/SignUp";
import "./App.css"; // Keep the basic styling
import type React from "react";

const App: React.FC = () => {
  return (
    <div className="App">
      <header className="App-header">
        <h1>Welcome to OnyxChat</h1>
        <SignUp />
      </header>
    </div>
  );
}

export default App;
