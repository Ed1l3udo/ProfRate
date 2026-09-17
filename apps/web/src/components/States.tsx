import { Link } from "react-router";

export function LoadingState({ children = "Carregando conteúdo..." }: { children?: string }) {
  return <p className="inline-state" role="status">{children}</p>;
}

export function EmptyState({ title, children, action }: { title: string; children: React.ReactNode; action?: { to: string; label: string } }) {
  return <section className="empty-state"><h2>{title}</h2><p>{children}</p>{action ? <Link className="empty-state-action" to={action.to}>{action.label}</Link> : null}</section>;
}

export function ErrorState({ children, onRetry }: { children: React.ReactNode; onRetry?: () => void }) {
  return <section className="error-state" role="alert"><p>{children}</p>{onRetry ? <button type="button" onClick={onRetry}>Tentar novamente</button> : null}</section>;
}
