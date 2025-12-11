import { useState } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import bg from "../context/b3.jpg";

    export default function Login() {
    const { login } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const from = location.state?.from?.pathname || "/bookings";

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    const res = await login({ email, password });

    if (res.success) {
      navigate(from, { replace: true });
    } else {
      setError(res.message || "Invalid credentials");
    }

    setLoading(false);
  };

  return (
    <div className="min-h-screen flex bg-gray-100">

      {/* LEFT IMAGE / BRANDING */}
      <div
        className="hidden lg:flex relative min-h-screen"
        style={{
          flexBasis: "55%",
          backgroundImage: `
            linear-gradient(
              to right,
              rgba(15, 23, 42, 0.45),
              rgba(15, 23, 42, 0.25),
              rgba(15, 23, 42, 0)
            ),
            url(${bg})
          `,
          backgroundSize: "cover",
          backgroundPosition: "center",
          backgroundRepeat: "no-repeat",
        }}
      >
        <div className="absolute bottom-8 left-8 text-white">
          <h1 className="text-4xl font-semibold">
            Luis Pool & Family
          </h1>
          <p className="text-sm opacity-90 mt-1">
            Hotel & Booking Management System
          </p>
        </div>
      </div>

      {/* RIGHT LOGIN PANEL */}
      <div
        className="flex items-center justify-center px-6"
        style={{ flexBasis: "45%" }}
      >
        <div
          className="w-full max-w-sm rounded-xl p-8
                     bg-white/95 backdrop-blur-sm
                     shadow-xl border border-gray-200"
        >

          {/* Header */}
          <div className="flex items-center gap-3 mb-6">
            <div className="h-10 w-10 rounded-full bg-gradient-to-br from-sky-400 to-blue-600
                            flex items-center justify-center text-white text-xl shadow">
              🏨
            </div>
            <div>
              <h2 className="text-xl font-semibold text-gray-800">
                Sign in
              </h2>
              <p className="text-sm text-gray-500">
                Use your staff account
              </p>
            </div>
          </div>

          {/* Error */}
          {error && (
            <div className="mb-4 text-sm text-red-600 bg-red-50 border border-red-200 rounded p-2">
              {error}
            </div>
          )}

          {/* Form */}
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Email
              </label>
              <input
                type="text"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg
                           focus:ring-2 focus:ring-sky-400 focus:border-sky-400"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Password
              </label>
              <input
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg
                           focus:ring-2 focus:ring-sky-400 focus:border-sky-400"
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full mt-2 px-4 py-2.5 rounded-lg
                         bg-gradient-to-r from-sky-500 to-blue-600
                         text-white font-medium
                         hover:from-sky-600 hover:to-blue-700
                         disabled:opacity-50"
            >
              {loading ? "Signing in..." : "Sign in"}
            </button>
          </form>

          {/* Footer */}
          <div className="mt-6 text-xs text-gray-400 text-center">
            © {new Date().getFullYear()} Luis Pool & Family
          </div>
        </div>
      </div>
    </div>
  );
}
