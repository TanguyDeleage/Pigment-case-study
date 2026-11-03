import type { DepartmentId, PersonId } from "@/lib/data/types"

/**
 * Lifecycle of a reclassification request. The prototype only reaches
 * "pending_approval"; later states exist for realism (Claire's side is out of scope).
 */
export type CorrectionStatus = "draft" | "pending_approval" | "needs_info" | "approved" | "rejected" | "posted"

export const STATUS_LABEL: Record<CorrectionStatus, string> = {
  draft: "Draft",
  pending_approval: "Pending approval",
  needs_info: "Needs info",
  approved: "Approved",
  rejected: "Rejected",
  posted: "Posted to ERP",
}

export type ReasonType = "wrong_cost_centre" | "wrong_gl_account" | "wrong_period" | "other"

export const REASON_LABEL: Record<ReasonType, string> = {
  wrong_cost_centre: "Wrong cost centre",
  wrong_gl_account: "Wrong GL account",
  wrong_period: "Wrong period",
  other: "Other",
}

export interface Coding {
  deptId: DepartmentId
  accountCode: string
}

export interface Evidence {
  kind: "invoice" | "purchase_order" | "file"
  label: string
}

export interface CorrectionRequest {
  id: string
  transactionId: string
  vendor: string
  amount: number
  from: Coding
  to: Coding
  reasonType: ReasonType
  comment: string
  evidence: Evidence[]
  requesterId: PersonId
  approverId: PersonId
  status: CorrectionStatus
  createdAt: string
  submittedAt?: string
}
