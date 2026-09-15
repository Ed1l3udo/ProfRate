import { Navigate, useLocation } from "react-router";

import { useAuth } from "./AuthContext.js";

export function ProtectedRoute({
  children,
  studentOnly = false,
  moderatorOnly = false,
  adminOnly = false,
}: {
  children: React.ReactNode;
  studentOnly?: boolean;
  moderatorOnly?: boolean;
  adminOnly?: boolean;
}) {
  const { status, user } = useAuth();
  const location = useLocation();

  if (status === "loading") {
    return <p className="state-message">Restaurando sessão...</p>;
  }

  if (status !== "authenticated" || user === null) {
    return (
      <Navigate
        to="/login"
        replace
        state={{ from: `${location.pathname}${location.search}` }}
      />
    );
  }

  if (studentOnly && user.role !== "student") {
    return <Navigate to="/account" replace />;
  }
  if (moderatorOnly && user.role !== "moderator" && user.role !== "admin") return <Navigate to="/account" replace />;
  if (adminOnly && user.role !== "admin") return <Navigate to="/account" replace />;

  return children;
}
