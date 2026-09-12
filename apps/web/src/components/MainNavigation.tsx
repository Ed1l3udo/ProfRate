import { NavLink } from "react-router";

import { useAuth } from "../auth/AuthContext.js";

export function MainNavigation() {
  const { logout, status, user } = useAuth();

  return (
    <nav className="main-navigation" aria-label="Navegação principal">
      <div className="main-navigation-links">
        <NavLink to="/" end>Professores</NavLink>
        <NavLink to="/disciplines">Disciplinas</NavLink>
        {status === "authenticated" && user?.role === "student" ? (
          <NavLink to="/my-reviews">Minhas avaliações</NavLink>
        ) : null}
        {status === "authenticated" ? <NavLink to="/account">Minha conta</NavLink> : null}
      </div>
      <div className="main-navigation-session">
        {status === "authenticated" && user !== null ? (
          <>
            <span aria-label="Usuário conectado">{user.name}</span>
            <button type="button" onClick={logout}>Sair</button>
          </>
        ) : status === "anonymous" ? (
          <>
            <NavLink to="/login">Entrar</NavLink>
            <NavLink to="/signup">Criar conta</NavLink>
          </>
        ) : <span>Restaurando sessão...</span>}
      </div>
    </nav>
  );
}
