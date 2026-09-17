const flaggedTerms = ["zarg", "blorpo", "grumax"];
function normalize(value: string) { return value.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase(); }
export function isCommentFlagged(comment: string) {
  const normalized = normalize(comment);
  return flaggedTerms.some((term) => new RegExp(`(^|[^a-z])${term}($|[^a-z])`, "i").test(normalized));
}
