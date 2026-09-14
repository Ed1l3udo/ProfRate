import { useState } from "react";

import { ModerationReportsSection } from "./components/ModerationReportsSection.js";
import { ModerationReviewsSection } from "./components/ModerationReviewsSection.js";
import { ModerationUsersSection } from "./components/ModerationUsersSection.js";

const tabs = [
  ["reviews", "Avaliações pendentes"],
  ["reports", "Denúncias"],
  ["users", "Usuários"],
] as const;

type Tab = (typeof tabs)[number][0];

export function ModerationPage() {
  const [activeTab, setActiveTab] = useState<Tab>("reviews");
  return <main className="page-shell moderation-page">
    <header className="page-header"><p className="eyebrow">Gestão da comunidade</p><h1>Moderação</h1><p className="page-intro">Revise novas avaliações, responda denúncias e gerencie bloqueios de contas.</p></header>
    <div className="moderation-tabs" role="tablist" aria-label="Áreas de moderação">
      {tabs.map(([id, label]) => <button key={id} id={`${id}-tab`} role="tab" aria-selected={activeTab === id} aria-controls={`${id}-panel`} tabIndex={activeTab === id ? 0 : -1} onClick={() => setActiveTab(id)}>{label}</button>)}
    </div>
    <section id="reviews-panel" role="tabpanel" aria-labelledby="reviews-tab" hidden={activeTab !== "reviews"} className="moderation-section"><h2>Avaliações pendentes</h2><ModerationReviewsSection /></section>
    <section id="reports-panel" role="tabpanel" aria-labelledby="reports-tab" hidden={activeTab !== "reports"} className="moderation-section"><h2>Denúncias</h2><ModerationReportsSection /></section>
    <section id="users-panel" role="tabpanel" aria-labelledby="users-tab" hidden={activeTab !== "users"} className="moderation-section"><h2>Usuários</h2><ModerationUsersSection /></section>
  </main>;
}
