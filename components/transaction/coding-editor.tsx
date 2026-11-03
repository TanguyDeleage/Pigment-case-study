"use client"

import { useState } from "react"
import { toast } from "sonner"
import { CURRENT_USER, DEPARTMENT_ORDER, DEPARTMENTS, PEOPLE, lineLabel, type DepartmentId, type Ledger, type Transaction } from "@/lib/data"
import { formatEur } from "@/lib/finance/format"
import { MIN_COMMENT_LENGTH, isCommentValid, routeApprover } from "@/lib/corrections/routing"
import { nextRequestId, useCorrections } from "@/lib/corrections/store"
import type { Coding, CorrectionRequest } from "@/lib/corrections/types"
import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Textarea } from "@/components/ui/textarea"

interface CodingEditorProps {
  transaction: Transaction
  from: Coding
  existing?: CorrectionRequest
  ledger: Ledger
  onDone: () => void
}

/** Inline recoding: the user picks the new cost centre and GL account, then submits it for review. */
export function CodingEditor({ transaction: t, from, existing, ledger, onDone }: CodingEditorProps) {
  const save = useCorrections((s) => s.save)
  const [toDept, setToDept] = useState<DepartmentId>(existing?.to.deptId ?? from.deptId)
  const [toAccount, setToAccount] = useState(existing?.to.accountCode ?? from.accountCode)
  const [comment, setComment] = useState(existing?.comment ?? "")
  const [touched, setTouched] = useState(false)

  const expenseAccounts = (dept: DepartmentId) =>
    ledger.lines.filter((l) => l.deptId === dept && l.lineType === "expense").map((l) => l.accountCode)
  const unchanged = toDept === from.deptId && toAccount === from.accountCode
  const errors = {
    to: unchanged ? "Pick a different cost centre or GL account." : null,
    comment: isCommentValid(comment) ? null : `Explain why, at least ${MIN_COMMENT_LENGTH} characters.`,
  }
  const route = routeApprover(t.amount, CURRENT_USER)
  const reviewer = PEOPLE[route.approverId]

  const submit = () => {
    setTouched(true)
    if (errors.to || errors.comment) return
    const now = new Date().toISOString()
    const request: CorrectionRequest = {
      id: existing?.id ?? nextRequestId(),
      transactionId: t.id,
      vendor: t.vendor,
      amount: t.amount,
      from,
      to: { deptId: toDept, accountCode: toAccount },
      reasonType: toDept !== from.deptId ? "wrong_cost_centre" : "wrong_gl_account",
      comment: comment.trim(),
      evidence: t.attachment ? [{ kind: "invoice", label: t.attachment.fileName }] : [],
      requesterId: CURRENT_USER,
      approverId: route.approverId,
      status: "pending_approval",
      createdAt: existing?.createdAt ?? now,
      submittedAt: now,
    }
    save(request)
    onDone()
    toast.success(`Sent to ${reviewer.name} for review`, {
      description: `${request.id} · ${formatEur(t.amount, { unit: "k" })} from ${DEPARTMENTS[from.deptId].name} to ${DEPARTMENTS[toDept].name}. Actuals update once approved and posted.`,
    })
  }

  return (
    <div className="space-y-3 rounded-lg border bg-muted/40 px-4 py-3.5">
      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-1.5">
          <Label className="text-[12.5px] text-muted-foreground">Cost centre</Label>
          <Select
            value={toDept}
            onValueChange={(v) => {
              const dept = v as DepartmentId
              setToDept(dept)
              const codes = expenseAccounts(dept)
              if (!codes.includes(toAccount)) setToAccount(codes[0])
            }}
          >
            <SelectTrigger aria-label="Cost centre" className="w-full bg-card">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {DEPARTMENT_ORDER.map((id) => (
                <SelectItem key={id} value={id}>
                  {DEPARTMENTS[id].name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-1.5">
          <Label className="text-[12.5px] text-muted-foreground">GL account</Label>
          <Select value={toAccount} onValueChange={setToAccount}>
            <SelectTrigger aria-label="GL account" className="w-full bg-card">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {expenseAccounts(toDept).map((code) => (
                <SelectItem key={code} value={code}>
                  {lineLabel(code)}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>
      {touched && errors.to && <p className="text-[12.5px] text-unfav">{errors.to}</p>}

      <div>
        <Label htmlFor="coding-comment" className="mb-1.5 text-[12.5px] text-muted-foreground">
          Note for the reviewer <span className="text-muted-foreground">(required)</span>
        </Label>
        <Textarea
          id="coding-comment"
          value={comment}
          onChange={(e) => setComment(e.target.value)}
          placeholder="Why is the current coding wrong, and how do you know?"
          aria-invalid={touched && !!errors.comment}
          className="min-h-20 bg-card text-[13.5px]"
        />
        {touched && errors.comment && <p className="mt-1 text-[12.5px] text-unfav">{errors.comment}</p>}
      </div>

      <div className="flex items-center gap-2">
        <span className="mr-auto text-[12.5px] text-muted-foreground">
          Reviewed by {reviewer.name}. Actuals don’t change until approved.
        </span>
        <Button variant="ghost" onClick={onDone}>
          Cancel
        </Button>
        <Button onClick={submit} className="px-4">
          Submit for review
        </Button>
      </div>
    </div>
  )
}
