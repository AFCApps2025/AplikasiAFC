import { useState, useEffect } from "react";
import { Eye, EyeOff, LogIn, Mail, Smartphone } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";

interface User {
  id: string;
  password: string;
  role: "admin" | "teknisi" | "manager" | "helper";
  name: string;
}

interface LoggedInUser {
  id: string;
  username: string;
  name: string;
  role: "admin" | "teknisi" | "manager" | "helper";
}

const getActiveUsersFromDatabase = async (): Promise<User[]> => {
  try {
    // Fetch active users from Supabase
    const { data, error } = await (supabase as any)
      .from("system_accounts")
      .select("*")
      .eq("active", true);

    if (error) throw error;

    if (data && data.length > 0) {
      // Map database accounts to User format
      const dbUsers = data.map((acc: any) => ({
        id: acc.username,
        password: acc.password,
        role: acc.role,
        name: acc.name,
      }));

      // Update localStorage for offline access
      localStorage.setItem("systemAccounts", JSON.stringify(data));

      return dbUsers;
    }
  } catch (error) {
    console.error("Error fetching users from database:", error);
  }

  // Fallback to localStorage if database fails
  const systemAccounts = JSON.parse(
    localStorage.getItem("systemAccounts") || "[]"
  );

  // Default users if no systemAccounts found
  const defaultUsers: User[] = [
    { id: "admin", password: "w753", role: "admin", name: "Administrator" },
    { id: "teknisi1", password: "afc1", role: "teknisi", name: "Taufiq" },
    { id: "teknisi2", password: "afc2", role: "teknisi", name: "Teknisi2" },
    { id: "umar", password: "u2025", role: "manager", name: "umar" },
    {
      id: "manager",
      password: "afc4",
      role: "manager",
      name: "Manager Teknisi",
    },
    { id: "iwan", password: "i2025", role: "manager", name: "Iwan" },
    { id: "dedy", password: "d2025", role: "manager", name: "Dedy" },
  ];

  if (systemAccounts.length === 0) {
    return defaultUsers;
  }

  // Filter only active accounts and map to User format
  const activeSystemAccounts = systemAccounts
    .filter((acc: any) => acc.active)
    .map((acc: any) => ({
      id: acc.username,
      password: acc.password,
      role: acc.role,
      name: acc.name,
    }));

  // Merge defaultUsers with systemAccounts, prioritizing systemAccounts
  const systemUsernames = new Set(activeSystemAccounts.map((u: User) => u.id));
  const mergedUsers = [
    ...activeSystemAccounts,
    ...defaultUsers.filter((u) => !systemUsernames.has(u.id)),
  ];

  return mergedUsers;
};

interface SimpleLoginProps {
  onLogin: (user: LoggedInUser) => void;
}

const SimpleLogin: React.FC<SimpleLoginProps> = ({ onLogin }) => {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null);
  const [showInstallPrompt, setShowInstallPrompt] = useState(false);

  useEffect(() => {
    const handler = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e);
      setShowInstallPrompt(true);
    };

    window.addEventListener("beforeinstallprompt", handler);

    return () => window.removeEventListener("beforeinstallprompt", handler);
  }, []);

  const handleInstallClick = async () => {
    if (!deferredPrompt) return;

    deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;

    if (outcome === "accepted") {
      setShowInstallPrompt(false);
    }

    setDeferredPrompt(null);
  };

  const handleDismissInstall = () => {
    setShowInstallPrompt(false);
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");

    try {
      // Fetch active users from database
      const USERS = await getActiveUsersFromDatabase();

      // Authenticate user
      const user = USERS.find(
        (u) => u.id === username && u.password === password
      );

      if (!user) {
        throw new Error("Username atau password salah");
      }

      // Store user data safely
      const userData: LoggedInUser = {
        id: user.id,
        username: user.id,
        name: user.name,
        role: user.role,
      };

      try {
        localStorage.setItem("currentUser", JSON.stringify(userData));
        localStorage.setItem("lastActivity", Date.now().toString());
      } catch (storageError) {
        console.error("LocalStorage error:", storageError);
        // Continue with login even if localStorage fails
      }

      // Play login sound
      const loginSound = new Audio(
        "https://cdn.pixabay.com/download/audio/2025/04/11/audio_8fc2b30703.mp3"
      );
      loginSound.volume = 0.7;
      loginSound.play().catch((err) => console.log("Login sound failed:", err));

      onLogin(userData);
    } catch (error: any) {
      console.error("Login error:", error);
      setError(error.message || "Terjadi kesalahan saat login");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div
      className="min-h-screen flex items-center justify-center p-4 bg-cover bg-center bg-no-repeat relative"
      style={{
        backgroundImage:
          "url(https://images.unsplash.com/photo-1718203862467-c33159fdc504?q=80&w=1170&auto=format&fit=crop&ixlib=rb-4.1.0&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D)",
      }}
    >
      {/* Dark overlay for better readability */}
      <div className="absolute inset-0 bg-black/50"></div>

      {/* PWA Install Prompt - Above Login Form */}
      {showInstallPrompt && (
        <div className="fixed top-4 left-4 right-4 z-50 animate-slide-down">
          <div className="bg-gradient-to-r from-green-600 to-green-700 rounded-2xl shadow-2xl p-4 max-w-md mx-auto border-2 border-green-400">
            <div className="flex items-start gap-3">
              <div className="flex-shrink-0 bg-white rounded-lg p-2">
                <Smartphone className="w-6 h-6 text-green-600" />
              </div>
              <div className="flex-1">
                <h3 className="text-white font-bold text-lg mb-1">
                  📱 Install AFC System sebagai aplikasi di HP Anda!
                </h3>
                <p className="text-green-100 text-sm mb-3">
                  Akses lebih cepat dan mudah tanpa browser
                </p>
                <div className="flex gap-2">
                  <button
                    onClick={handleInstallClick}
                    className="flex-1 bg-white text-green-700 font-bold py-2 px-4 rounded-lg hover:bg-green-50 transition-colors shadow-md"
                  >
                    Install
                  </button>
                  <button
                    onClick={handleDismissInstall}
                    className="flex-1 bg-green-800 text-white font-bold py-2 px-4 rounded-lg hover:bg-green-900 transition-colors border border-green-600"
                  >
                    Nanti
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      <div className="neon-login-container relative z-10">
        <div className="neon-login-box">
          <form onSubmit={handleLogin} className="neon-form">
            {/* AFC Logo */}
            <div className="neon-logo">
              <img
                src="https://i.pinimg.com/736x/10/1e/a6/101ea6b3464455757657e2fccaad69c8.jpg"
                alt="AFC Logo"
                className="w-full h-full object-cover rounded-full"
              />
            </div>

            {/* Header - FROST */}
            <span className="neon-header" style={{ fontFamily: "Lilita One" }}>
              FROST
            </span>

            {/* Username Input */}
            <input
              type="text"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              placeholder="Username"
              className="neon-input"
              required
            />

            {/* Password Input */}
            <div className="relative w-full">
              <input
                type={showPassword ? "text" : "password"}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Password"
                className="neon-input pr-12"
                required
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-white transition-colors"
              >
                {showPassword ? (
                  <EyeOff className="w-5 h-5" />
                ) : (
                  <Eye className="w-5 h-5" />
                )}
              </button>
            </div>

            {/* Error Message */}
            {error && (
              <div className="bg-red-900/50 border border-red-500 text-red-300 px-4 py-3 rounded-lg text-sm w-full">
                {error}
              </div>
            )}

            {/* Sign In Button */}
            <button
              type="submit"
              disabled={loading}
              className="neon-button neon-sign-in"
            >
              {loading ? (
                <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
              ) : (
                <>
                  <LogIn className="w-5 h-5 mr-2" />
                  Sign In
                </>
              )}
            </button>

            {/* Footer */}
            <p className="neon-footer">
              Sistem Manajemen Service AFC
              <br />
              <span className="text-orange-400">FROST</span>
            </p>
          </form>
        </div>
      </div>
    </div>
  );
};

export default SimpleLogin;
