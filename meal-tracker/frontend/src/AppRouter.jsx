import { Routes, Route } from "react-router-dom";
import { useEffect, useState } from "react";
import Dashboard from "./Dashboard";
import Signup from "./Signup";
import Login from "./Login";
import OAuthCallback from "./OAuthCallback";
import { restoreSession, subscribeAccessToken } from "./lib/apiFetch";

import { Navigate } from "react-router-dom";

function ProtectedRoute({ loading, authed, children }) {
  if (loading) {
    return ;
  }

  if (!authed) {
    return <Navigate to="/login" replace />;
  }

  return children;
}

export default function AppRouter() {
  const [loading, setLoading] = useState(true);
  const [authed, setAuthed] = useState(false);

  useEffect(() => {
    const unsub = subscribeAccessToken((token) => {
      setAuthed(!!token);
      setLoading(false);
    });
    (async () => {
      const ok = await restoreSession();
      setAuthed(ok);
      setLoading(false);
    })();

    return unsub;
  }, []);

  return (
    <Routes>
      <Route path="/login" element={<Login />} />
      <Route path="/signup" element={<Signup />} />
      <Route path="/oauth/callback" element={<OAuthCallback />} />
      <Route
        path="/"
        element={
          <ProtectedRoute loading={loading} authed={authed}>
            <Dashboard />
          </ProtectedRoute>
        }
      />
    </Routes>
  );
}
