import { createUserWithEmailAndPassword } from "firebase/auth";
import React, { useState } from "react";
import { auth } from "../firebase";

const SignUp: React.FC = () => {
  const [email, setEmail] = useState<string>("");
  const [password, setPassword] = useState<string>("");

  const handleSignUp = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault(); // Prevent the form from refreshing the page
    try {
      // 1. Create user in Firebase
      const userCredential = await createUserWithEmailAndPassword(
        auth,
        email,
        password
      );
      console.log("Firbase user created:", userCredential.user);

      // 2. Send user data to backend
      const response = await fetch("http://localhost:8080/api/users", {
        method: "POST",
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          id: userCredential.user.uid,
          email: userCredential.user.email,
        }),
      });

      if(!response.ok){
        console.log("Response not ok:", response);
        throw new Error(`Failed to create user in backend: ${response.statusText}`);
      }

      const backendUser = await response.json();
      console.log("Backend user created:", backendUser);

      alert("Sign up successful!");

    } catch (error) {
      console.error("Error signing up:", error);
      if (error instanceof Error) alert(`Error: ${error.message}`);
    }
  };

  return (
    <div>
      <h2>Sign Up</h2>
      <form onSubmit={handleSignUp}>
        <div>
          <label>Email:</label>
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
          <label>Password:</label>
          <input
            type="password"
            value={password}
            onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
              setPassword(e.target.value)
            }
            required
          />
        </div>
        <button type="submit">Sign Up</button>
      </form>
    </div>
  );
};

export default SignUp;
