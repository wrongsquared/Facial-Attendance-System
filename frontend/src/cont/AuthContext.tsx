// src/context/AuthContext.tsx
import { createContext, useContext, useState, useEffect, ReactNode } from "react";
import { AuthResponse } from "../types/auth";
import { logoutUser } from "../services/api";

interface AuthContextType {
  user: AuthResponse | null;
  token: string | null;
  login: (data: AuthResponse) => Promise<void>;
  logout: () => void;
  updateUserPhoto: (photoUrl: string) => void;
  refreshUserPhoto: () => Promise<void>;
  isAuthenticated: boolean;
  loading: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [user, setUser] = useState<AuthResponse | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  // Load token from LocalStorage on startup
  useEffect(() => {
    const storedUser = localStorage.getItem("user");
    const storedToken = localStorage.getItem("token");
    if (storedUser && storedToken) {
      try {
        const parsedUser = JSON.parse(storedUser);
        setUser(parsedUser);
        setToken(storedToken);

        // Refresh user photo after setting user and token, but only if user has a valid user_id
        if (parsedUser && parsedUser.user_id) {
          console.log('AuthContext: Refreshing user photo on startup for user:', parsedUser.user_id);
          console.log('AuthContext: Current stored photo URL:', parsedUser.photo);
          setTimeout(async () => {
            try {
              const apiUrl = `${import.meta.env.VITE_API_URL || 'http://localhost:8000'}/users/profile-photo?user_id=${encodeURIComponent(parsedUser.user_id)}`;
              console.log('AuthContext: Fetching photo from:', apiUrl);
              const response = await fetch(apiUrl, {
                headers: {
                  'Authorization': `Bearer ${storedToken}`
                }
              });


              if (response.ok) {
                const data = await response.json();
                if (data.url) {
                  const updatedUser = { ...parsedUser, photo: data.url };
                  setUser(updatedUser);
                  localStorage.setItem("user", JSON.stringify(updatedUser));
                } else {
                  console.log('AuthContext: No URL in response data');
                }
              } else if (response.status === 404) {
                console.log('AuthContext: No profile photo found (404), clearing stored photo');
                // User has no profile photo, ensure photo is empty string
                if (parsedUser.photo) {
                  const updatedUser = { ...parsedUser, photo: "" };
                  setUser(updatedUser);
                  localStorage.setItem("user", JSON.stringify(updatedUser));
                }
              } else {
                const errorText = await response.text();
              }
            } catch (error) {
              console.warn("Failed to refresh user photo on startup:", error);
            }
          }, 100);
        } else {
          console.log('AuthContext: No user_id found, skipping photo refresh');
        }
      } catch (error) {
        console.error("Failed to parse stored user data:", error);
        // Clear corrupted data
        localStorage.removeItem("user");
        localStorage.removeItem("token");
      }
    }
    setLoading(false);
  }, []);

  const login = async (data: AuthResponse) => {
    console.log('AuthContext: Login called with data:', data);
    setUser(data);
    setToken(data.access_token);
    // Save to localStorage so refresh doesn't log them out
    localStorage.setItem("user", JSON.stringify(data));
    localStorage.setItem("token", data.access_token);

    if (data.user_id) {
      try {
        const apiUrl = `${import.meta.env.VITE_API_URL || 'http://localhost:8000'}/users/profile-photo?user_id=${encodeURIComponent(data.user_id)}`;
        const response = await fetch(apiUrl, {
          headers: {
            'Authorization': `Bearer ${data.access_token}`
          }
        });


        if (response.ok) {
          const photoData = await response.json();
          if (photoData.url) {
            console.log('AuthContext: Updating photo immediately to:', photoData.url);
            const updatedUser = { ...data, photo: photoData.url };
            setUser(updatedUser);
            localStorage.setItem("user", JSON.stringify(updatedUser));
          }
        } else if (response.status === 404) {
          console.log('AuthContext: No photo found during login (404)');
          // User has no profile photo, ensure photo is cleared
          const updatedUser = { ...data, photo: "" };
          setUser(updatedUser);
          localStorage.setItem("user", JSON.stringify(updatedUser));
        } else {
          
        }
      } catch (error) {
        console.warn('AuthContext: Failed to fetch photo during login:', error);
      }
    }
  };

  const updateUserPhoto = (photoUrl: string) => {
    if (user) {
      const updatedUser = { ...user, photo: photoUrl };
      setUser(updatedUser);
      localStorage.setItem("user", JSON.stringify(updatedUser));
    }
  };

  const refreshUserPhoto = async () => {
    console.log('refreshUserPhoto: Called with user:', user?.user_id, 'token exists:', !!token);
    if (user && token && user.user_id) {
      try {
        const apiUrl = `${import.meta.env.VITE_API_URL || 'http://localhost:8000'}/users/profile-photo?user_id=${encodeURIComponent(user.user_id)}`;
        console.log('refreshUserPhoto: Fetching from:', apiUrl);
        const response = await fetch(apiUrl, {
          headers: {
            'Authorization': `Bearer ${token}`
          }
        });

        console.log('refreshUserPhoto: Response status:', response.status);

        if (response.ok) {
          const data = await response.json();
          console.log('refreshUserPhoto: Response data:', data);
          if (data.url) {
            console.log('refreshUserPhoto: Updating photo to:', data.url);
            updateUserPhoto(data.url);
          } else {
            console.log('refreshUserPhoto: No URL in response');
          }
        } else if (response.status === 404) {
          console.log('refreshUserPhoto: No photo found (404), clearing photo');
          // User has no profile photo, clear the photo
          updateUserPhoto("");
        } else {
          console.log('refreshUserPhoto: Request failed with status:', response.status);
          const errorText = await response.text();
          console.log('refreshUserPhoto: Error response:', errorText);
        }
      } catch (error) {
        console.warn("Failed to refresh user photo:", error);
      }
    } else {
      console.log('refreshUserPhoto: Missing requirements - user:', !!user, 'token:', !!token, 'user_id:', user?.user_id);
    }
  };

  const logout = async () => {
    if (token) {
      try {
        await logoutUser(token);
      } catch (error) {
        console.warn("Server logout failed, but clearing local state anyway.", error);
      }
    }

    // Clear everything locally
    setUser(null);
    setToken(null);
    localStorage.removeItem("user");
    localStorage.removeItem("token");

    // Clear any other keys 
    // localStorage.clear(); 
  };

  return (
    <AuthContext.Provider value={{ user, token, login, logout, updateUserPhoto, refreshUserPhoto, isAuthenticated: !!token, loading }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) throw new Error("useAuth must be used within an AuthProvider");
  return context;
};