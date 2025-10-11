import { signInWithEmailAndPassword } from "firebase/auth";
import type React from "react";
import { useState } from "react";
import { auth } from "../firebase";

const Login: React.FC = () => {
  const [email, setEmail] = useState<string>("");
  const [password, setPassword] = useState<string>("");
  const [error, setError] = useState<string | null>(null);

  const handleLogin = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setError(null);
    try {
      // Step 1: Sign in with Firebase
      // Use Firebase function to sign in
      const userCredential = await signInWithEmailAndPassword(
        auth,
        email,
        password
      );

      // Get the ID token from tthe user object
      const idToken = await userCredential.user.getIdToken();

      console.log("User signed in:", userCredential.user);
      console.log("Firebase ID Token:", idToken);

      // Step 2: Call our protected backend endpoint with the token
      const response = await fetch("http://localhost:8080/api/me", {
        method: "GET",
        headers: {
          Authorization: `Bearer ${idToken}`,
        },
      });

      if (!response.ok) {
        throw new Error(`Failed to fetch user data: ${response.statusText}`);
      }

      const data = await response.json();
      console.log("Protected backend response:", data);

      alert("Login successful!");
    } catch (error) {
      console.error("Login error:", error);
      setError(error instanceof Error ? error.message : "Login failed");
    }
  };

  return (
    <div>
      <h2>Logging</h2>
      <form onSubmit={handleLogin}>
        <div>
          <label htmlFor="email">Email:</label>
          <input
            type="email"
            value={email}
            onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
              setEmail(e.target.value)
            }
            required
          />
        </div>
        <div>
          <label htmlFor="password">Password:</label>
          <input
            type="password"
            value={password}
            onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
              setPassword(e.target.value)
            }
            required
          />
        </div>
        {error && <p style={{ color: "red" }}>{error}</p>}
        <button type="submit">Login</button>
      </form>
    </div>
  );
};

export default Login;
