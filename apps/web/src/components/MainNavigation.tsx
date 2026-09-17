import { useState } from "react";
import { NavLink } from "react-router";

import { useAuth } from "../auth/AuthContext.js";

export function MainNavigation() {
  const { logout, status, user } = useAuth();
  const [isOpen, setIsOpen] = useState(false);
  const closeMenu = () => setIsOpen(false);

  const navigationLink = (to: string, label: string, end = false) => (
    <NavLink to={to} end={end} onClick={closeMenu}>{label}</NavLink>
  );

  return (
    <header className="app-header">
      <nav className="main-navigation" aria-label="Navegação principal">
        <NavLink className="brand" to="/" end onClick={closeMenu} aria-label="ProfRate, página inicial">
          <svg aria-hidden="true" viewBox="0 0 32 32" focusable="false"><path d="M4 11.5 16 5l12 6.5-12 6.5-8-4.3v7.1c0 2.2 3.6 4.2 8 4.2s8-2 8-4.2v-7.1L16 18" /></svg>
          <span>ProfRate</span>
        </NavLink>
        <button className="navigation-toggle" type="button" aria-expanded={isOpen} aria-controls="primary-navigation" onClick={() => setIsOpen((current) => !current)}>
          <span aria-hidden="true">☰</span><span className="sr-only">{isOpen ? "Fechar" : "Abrir"} menu</span>
        </button>
        <div className={`navigation-panel${isOpen ? " is-open" : ""}`} id="primary-navigation">
          <div className="main-navigation-links">
        {navigationLink("/", "Professores", true)}
        {navigationLink("/disciplines", "Disciplinas")}
        {navigationLink("/rankings", "Rankings")}
        {status === "authenticated" ? navigationLink("/favorites", "Favoritos") : null}
        {status === "authenticated" && user?.role === "student" ? (
          navigationLink("/my-reviews", "Minhas avaliações")
        ) : null}
        {status === "authenticated" && (user?.role === "moderator" || user?.role === "admin") ? navigationLink("/moderation", "Moderação") : null}
        {status === "authenticated" && user?.role === "admin" ? navigationLink("/admin", "Administração") : null}
        {status === "authenticated" ? navigationLink("/account", "Minha conta") : null}
          </div>
          <div className="main-navigation-session">
        {status === "authenticated" && user !== null ? (
          <>
            <span aria-label="Usuário conectado">{user.name}</span>
            <button type="button" onClick={() => { closeMenu(); logout(); }}>Sair</button>
          </>
        ) : status === "anonymous" ? (
          <>
            {navigationLink("/login", "Entrar")}
            {navigationLink("/signup", "Criar conta")}
          </>
        ) : <span>Restaurando sessão...</span>}
          </div>
        </div>
      </nav>
    </header>
  );
}
