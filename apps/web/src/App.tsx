import { Route, Routes } from "react-router";

import { MainNavigation } from "./components/MainNavigation.js";
import { DisciplineDetailsPage } from "./pages/DisciplineDetailsPage.js";
import { DisciplinesListPage } from "./pages/DisciplinesListPage.js";
import { ProfessorDetailsPage } from "./pages/ProfessorDetailsPage.js";
import { ProfessorsListPage } from "./pages/ProfessorsListPage.js";

export function App() {
  return (
    <>
      <MainNavigation />
      <Routes>
        <Route path="/" element={<ProfessorsListPage />} />
        <Route path="/professors/:id" element={<ProfessorDetailsPage />} />
        <Route path="/disciplines" element={<DisciplinesListPage />} />
        <Route path="/disciplines/:id" element={<DisciplineDetailsPage />} />
      </Routes>
    </>
  );
}
