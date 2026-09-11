import { NavLink } from "react-router";

export function MainNavigation() {
  return (
    <nav className="main-navigation" aria-label="Navegação principal">
      <NavLink to="/" end>Professores</NavLink>
      <NavLink to="/disciplines">Disciplinas</NavLink>
    </nav>
  );
}
