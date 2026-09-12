import { Route, Routes } from "react-router";

import { AuthProvider } from "./auth/AuthContext.js";
import { ProtectedRoute } from "./auth/ProtectedRoute.js";
import { MainNavigation } from "./components/MainNavigation.js";
import { DisciplineDetailsPage } from "./pages/DisciplineDetailsPage.js";
import { DisciplinesListPage } from "./pages/DisciplinesListPage.js";
import { LoginPage } from "./pages/LoginPage.js";
import { MyAccountPage } from "./pages/MyAccountPage.js";
import { MyReviewsPage } from "./pages/MyReviewsPage.js";
import { ProfessorDetailsPage } from "./pages/ProfessorDetailsPage.js";
import { ProfessorsListPage } from "./pages/ProfessorsListPage.js";
import { SignupPage } from "./pages/SignupPage.js";

export function App() {
  return (
    <AuthProvider>
      <MainNavigation />
      <Routes>
        <Route path="/" element={<ProfessorsListPage />} />
        <Route path="/professors/:id" element={<ProfessorDetailsPage />} />
        <Route path="/disciplines" element={<DisciplinesListPage />} />
        <Route path="/disciplines/:id" element={<DisciplineDetailsPage />} />
        <Route path="/login" element={<LoginPage />} />
        <Route path="/signup" element={<SignupPage />} />
        <Route path="/account" element={(
          <ProtectedRoute><MyAccountPage /></ProtectedRoute>
        )} />
        <Route path="/my-reviews" element={(
          <ProtectedRoute studentOnly><MyReviewsPage /></ProtectedRoute>
        )} />
      </Routes>
    </AuthProvider>
  );
}
