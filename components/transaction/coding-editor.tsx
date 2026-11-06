"use client"

import { useState } from "react"
import { Send } from "lucide-react"
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

/** Inline recoding: the user suggests a new cost centre and GL account, which goes to an approver. */
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
    toast.success(`Suggestion sent to ${reviewer.name}`, {
      description: `${formatEur(t.amount, { unit: "k" })} from ${DEPARTMENTS[from.deptId].name} to ${DEPARTMENTS[toDept].name}. Actuals update once approved.`,
    })
  }

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-[104px_1fr] items-start gap-x-4 gap-y-3 text-[13.5px]">
        <Label htmlFor="coding-dept" className="h-9 font-medium">
          Cost centre
        </Label>
        <div>
          <Select
            value={toDept}
            onValueChange={(v) => {
              const dept = v as DepartmentId
              setToDept(dept)
              const codes = expenseAccounts(dept)
              if (!codes.includes(toAccount)) setToAccount(codes[0])
            }}
          >
            <SelectTrigger
              id="coding-dept"
              className="h-9 w-full data-[size=default]:h-9 aria-[invalid=true]:border-unfav"
              aria-invalid={touched && !!errors.to}
            >
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
          {toDept !== from.deptId && <p className="mt-1.5 text-[12px] text-muted-foreground">Was {DEPARTMENTS[from.deptId].name}</p>}
        </div>

        <Label htmlFor="coding-account" className="h-9 font-medium">
          GL account
        </Label>
        <div>
          <Select value={toAccount} onValueChange={setToAccount}>
            <SelectTrigger id="coding-account" className="h-9 w-full data-[size=default]:h-9">
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
          {toAccount !== from.accountCode && <p className="mt-1.5 text-[12px] text-muted-foreground">Was {lineLabel(from.accountCode)}</p>}
        </div>
      </div>
      {touched && errors.to && <p className="text-[12.5px] text-unfav">{errors.to}</p>}

      <div>
        <Label htmlFor="coding-comment" className="mb-2 text-[13.5px] font-semibold">
          Why this change?
        </Label>
        <Textarea
          id="coding-comment"
          value={comment}
          onChange={(e) => setComment(e.target.value)}
          placeholder="What makes the current coding wrong, and how do you know?"
          aria-invalid={touched && !!errors.comment}
          className="min-h-20 text-[13.5px]"
        />
        <p className={touched && errors.comment ? "mt-1.5 text-[12px] text-unfav" : "mt-1.5 text-[12px] text-muted-foreground"}>
          {touched && errors.comment ? errors.comment : "Goes to the approver and stays in the audit trail."}
        </p>
      </div>

      <div className="flex justify-end gap-2">
        <Button variant="outline" size="lg" onClick={onDone}>
          Cancel
        </Button>
        <Button size="lg" onClick={submit} className="bg-brand px-3.5 text-white hover:bg-brand/90">
          <Send /> Send suggestion
        </Button>
      </div>
    </div>
  )
}
