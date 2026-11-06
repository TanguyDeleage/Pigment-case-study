"use client"

import { create } from "zustand"
import { lineId } from "@/lib/data/chart-of-accounts"
import type { CorrectionRequest } from "./types"

interface CorrectionsState {
  requests: CorrectionRequest[]
  /** Creates or replaces a request (drafts are re-saved under the same id). */
  save: (request: CorrectionRequest) => void
  /** Withdraws a request before it is approved. */
  remove: (id: string) => void
}

/** In-memory only: a page reload resets the demo. */
export const useCorrections = create<CorrectionsState>((set) => ({
  requests: [],
  save: (request) =>
    set((s) => ({ requests: [...s.requests.filter((r) => r.id !== request.id), request] })),
  remove: (id) => set((s) => ({ requests: s.requests.filter((r) => r.id !== id) })),
}))

let sequence = 42
export function nextRequestId(): string {
  return `CR-2026-${String(sequence++).padStart(4, "0")}`
}

export function usePendingRequests(): CorrectionRequest[] {
  const requests = useCorrections((s) => s.requests)
  return requests.filter((r) => r.status === "pending_approval")
}

/** Pending requests touching a ledger line, as source or destination. */
export function pendingForLine(requests: CorrectionRequest[], id: string): CorrectionRequest[] {
  return requests.filter(
    (r) =>
      r.status === "pending_approval" &&
      (lineId(r.from.deptId, r.from.accountCode) === id || lineId(r.to.deptId, r.to.accountCode) === id),
  )
}

export function requestForTransaction(requests: CorrectionRequest[], transactionId: string): CorrectionRequest | undefined {
  return requests.find((r) => r.transactionId === transactionId)
}
