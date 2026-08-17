import { Route, Routes } from "react-router";

import { ProfessorDetailsPage } from "./pages/ProfessorDetailsPage.js";
import { ProfessorsListPage } from "./pages/ProfessorsListPage.js";

export function App() {
  return (
    <Routes>
      <Route path="/" element={<ProfessorsListPage />} />
      <Route path="/professors/:id" element={<ProfessorDetailsPage />} />
    </Routes>
  );
}
