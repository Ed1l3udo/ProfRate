export const REVIEW_COMMENT_MAX_LENGTH = 500;

export function countReviewCommentCharacters(comment: string) {
  return Array.from(comment.trim()).length;
}
