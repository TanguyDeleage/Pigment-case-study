import type { PersonId } from "@/lib/data/types"

/** Tiered approval: the controller approves below this amount, the CFO at or above it. */
export const CFO_APPROVAL_THRESHOLD = 50_000

export interface ApprovalRoute {
  approverId: PersonId
  rule: string
}

export function routeApprover(amount: number, requesterId: PersonId): ApprovalRoute {
  const route: ApprovalRoute =
    Math.abs(amount) < CFO_APPROVAL_THRESHOLD
      ? { approverId: "claire", rule: "Corrections under €50k are approved by the financial controller." }
      : { approverId: "sophie", rule: "Corrections of €50k and above are approved by the CFO." }
  // Maker-checker: nobody approves their own request.
  if (route.approverId === requesterId) return { approverId: "sophie", rule: "Escalated: requester can't approve their own request." }
  return route
}

export const MIN_COMMENT_LENGTH = 20

export function isCommentValid(comment: string): boolean {
  return comment.trim().length >= MIN_COMMENT_LENGTH
}
