import SignUp from "./components/SignUp";
import "./App.css"; // Keep the basic styling
import type React from "react";
import Login from "./components/Login";
import Chat from "./components/Chat";
import { useAuth } from "./context/AuthContext";
import { signOut } from "firebase/auth";
import { auth } from "./firebase";

const App: React.FC = () => {
  const { token, loading } = useAuth();

  // 1. Show a loading spinner while Firebase checks if we are logged in
  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen bg-slate-100">
        <div className="text-xl font-semibold text-slate-600">
          Loading OnyxChat...
        </div>
      </div>
    );
  }

  // 2. If we have a token, show the Chat UI
  if (token) {
    return (
      <div className="h-screen flex flex-col">
        {/* Simple Header */}
        <header className="bg-white border-b border-slate-200 p-4 shadow-sm flex justify-between items-center">
          <h1 className="text-xl font-bold text-slate-800">OnyxChat</h1>
          <button
            onClick={() => signOut(auth)} // Temporary logout (just refreshes for now)
            className="text-sm text-red-500 hover:text-red-700 font-medium"
          >
            Sign Out
          </button>
        </header>

        {/* Chat Area */}
        <main className="flex-1 overflow-hidden bg-slate-50">
          <Chat token={token} />
        </main>
      </div>
    );
  }

  // 3. If no token, show the Login/Signup Forms
  return (
    <div className="min-h-screen bg-slate-100 flex flex-col items-center justify-center p-4">
      <div className="mb-8 text-center">
        <h1 className="text-4xl font-extrabold text-slate-900 tracking-tight">
          OnyxChat
        </h1>
        <p className="text-slate-600 mt-2">
          Real-time conversations, simplified.
        </p>
      </div>

      <div className="bg-white p-8 rounded-xl shadow-lg w-full max-w-4xl flex flex-col md:flex-row gap-8">
        <div className="flex-1">
          <h2 className="text-xl font-semibold mb-4 text-slate-800">
            New here?
          </h2>
          <SignUp />
        </div>

        <div className="hidden md:block w-px bg-slate-200"></div>

        <div className="flex-1">
          <h2 className="text-xl font-semibold mb-4 text-slate-800">
            Welcome back
          </h2>
          {/* We don't need to pass a callback anymore, the Context handles the update! */}
          <Login />
        </div>
      </div>
    </div>
  );
};

export default App;
