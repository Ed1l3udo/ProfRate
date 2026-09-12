import { Navigate, useLocation } from "react-router";

import { useAuth } from "./AuthContext.js";

export function ProtectedRoute({
  children,
  studentOnly = false,
}: {
  children: React.ReactNode;
  studentOnly?: boolean;
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

  return children;
}
