import { onAuthStateChanged, type User as FirebaseUser } from 'firebase/auth'
import React, { createContext, useContext, useEffect, useState, type ReactNode } from 'react';
import { auth } from '../firebase';

interface AuthContextType {
    user: FirebaseUser | null;
    token: string | null;
    loading: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

// 1. The Provider Component
// This wraps our entire app and provides the auth state to everyone.
export const AuthProvider: React.FC<{ children: ReactNode}> = ({children}) => {
    const [user, setUser] = useState<FirebaseUser | null>(null);
    const [token, setToken] = useState<string | null>(null);
    const [loading, setLoading] = useState<boolean>(true);

    useEffect(() => {
      // Firebase listener: automatically detects login/logout events
      const unsubscribe = onAuthStateChanged(auth, async (currentUser) => {
        setUser(currentUser);

        if (currentUser) {
          const idToken = await currentUser.getIdToken();
          setToken(idToken);
          console.log("User logged in, token set.");
        } else {
          setToken(null);
          console.log("No user, token cleared.");
        }

        setLoading(false);
      });

      return () => unsubscribe();
    }, []);

    return (
      <AuthContext.Provider value={{ user, token, loading }}>
        {children}
      </AuthContext.Provider>
    );
}

// 2. Custom Hook
// This makes it super easy to use auth in any component: `const { token } = useAuth();`
export const useAuth = () => {
    const context = useContext(AuthContext);
    if (context === undefined) {
      throw new Error("useAuth must be used within an AuthProvider");
    }
    return context;
}