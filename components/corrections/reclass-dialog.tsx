"use client"

import { useState } from "react"
import { ArrowRight, Check, Flag, Paperclip } from "lucide-react"
import { toast } from "sonner"
import { CURRENT_USER, DEPARTMENT_ORDER, DEPARTMENTS, PEOPLE, lineLabel, type DepartmentId, type Ledger, type Transaction } from "@/lib/data"
import { CURRENT_MONTH } from "@/lib/data/calendar"
import { findLine } from "@/lib/finance/aggregate"
import { formatEur, formatEurExact, formatPct, rowDecimals } from "@/lib/finance/format"
import { isFavourable, variance, variancePct } from "@/lib/finance/variance"
import { reclassImpact, type ImpactRow } from "@/lib/corrections/impact"
import { MIN_COMMENT_LENGTH, isCommentValid, routeApprover } from "@/lib/corrections/routing"
import { nextRequestId, useCorrections } from "@/lib/corrections/store"
import { REASON_LABEL, type CorrectionRequest, type Evidence, type ReasonType } from "@/lib/corrections/types"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { Checkbox } from "@/components/ui/checkbox"
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Textarea } from "@/components/ui/textarea"

interface ReclassDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  transaction: Transaction
  suggestion?: { deptId: DepartmentId; accountCode: string; poRef: string }
  existing?: CorrectionRequest
  ledger: Ledger
}

export function ReclassDialog(props: ReclassDialogProps) {
  return (
    <Dialog open={props.open} onOpenChange={props.onOpenChange}>
      <DialogContent className="max-h-[92vh] gap-0 overflow-y-auto p-0 sm:max-w-[980px]">
        {props.open && <ReclassForm {...props} />}
      </DialogContent>
    </Dialog>
  )
}

function ReclassForm({ onOpenChange, transaction: t, suggestion, existing, ledger }: ReclassDialogProps) {
  const save = useCorrections((s) => s.save)
  const source = findLine(ledger, t.lineId)!
  const from = { deptId: source.deptId as DepartmentId, accountCode: source.accountCode }

  const [toDept, setToDept] = useState<DepartmentId>(existing?.to.deptId ?? suggestion?.deptId ?? from.deptId)
  const [toAccount, setToAccount] = useState(existing?.to.accountCode ?? suggestion?.accountCode ?? from.accountCode)
  const [amountText, setAmountText] = useState(String(existing?.amount ?? t.amount))
  const [reason, setReason] = useState<ReasonType>(existing?.reasonType ?? "wrong_cost_centre")
  const [comment, setComment] = useState(existing?.comment ?? "")
  const [evidence, setEvidence] = useState<Record<string, boolean>>({ invoice: true, po: true })
  const [touched, setTouched] = useState(false)

  const accountsInDept = ledger.lines.filter((l) => l.deptId === toDept && l.lineType === "expense").map((l) => l.accountCode)
  const amount = Number(amountText.replace(/[^\d.]/g, ""))
  const to = { deptId: toDept, accountCode: toAccount }

  const errors = {
    to: toDept === from.deptId && toAccount === from.accountCode ? "Choose a different cost centre or account." : null,
    amount: !amount || amount <= 0 ? "Enter an amount." : amount > t.amount ? `Can't exceed ${formatEurExact(t.amount)}.` : null,
    comment: isCommentValid(comment) ? null : `Explain why, at least ${MIN_COMMENT_LENGTH} characters.`,
  }
  const valid = !errors.to && !errors.amount && !errors.comment

  const impact = errors.to || errors.amount ? [] : reclassImpact(ledger, from, to, amount, CURRENT_MONTH)
  const route = routeApprover(amount || t.amount, CURRENT_USER)
  const approver = PEOPLE[route.approverId]

  const suggestedComment = suggestion
    ? `Invoice is for the EMEA Sales Summit stand in Lisbon, ordered by Sales EMEA under ${suggestion.poRef}. It was coded to ${DEPARTMENTS[from.deptId].name} by the ${t.vendor} vendor default.`
    : ""

  const evidenceList = (): Evidence[] => [
    ...(evidence.invoice && t.attachment ? [{ kind: "invoice" as const, label: t.attachment.fileName }] : []),
    ...(evidence.po && suggestion ? [{ kind: "purchase_order" as const, label: suggestion.poRef }] : []),
  ]

  const build = (status: CorrectionRequest["status"]): CorrectionRequest => {
    const now = new Date().toISOString()
    return {
      id: existing?.id ?? nextRequestId(),
      transactionId: t.id,
      vendor: t.vendor,
      amount,
      from,
      to,
      reasonType: reason,
      comment: comment.trim(),
      evidence: evidenceList(),
      requesterId: CURRENT_USER,
      approverId: route.approverId,
      status,
      createdAt: existing?.createdAt ?? now,
      submittedAt: status === "pending_approval" ? now : undefined,
    }
  }

  const submit = () => {
    setTouched(true)
    if (!valid) return
    const request = build("pending_approval")
    save(request)
    onOpenChange(false)
    toast.success(`Sent to ${approver.name} for approval`, {
      description: `${request.id} · ${formatEur(amount, { unit: "k" })} from ${DEPARTMENTS[from.deptId].name} to ${DEPARTMENTS[toDept].name}. Actuals update once approved and posted.`,
    })
  }

  const saveDraft = () => {
    if (errors.amount || errors.to) return setTouched(true)
    const request = build("draft")
    save(request)
    onOpenChange(false)
    toast(`Draft ${request.id} saved`, { description: "Not sent. Find it under Corrections in the sidebar." })
  }

  return (
    <>
      <DialogHeader className="border-b px-6 pt-5 pb-4">
        <DialogTitle className="text-[19px]">Request reclassification</DialogTitle>
        <DialogDescription className="text-[13.5px]">
          Moves {t.vendor} ({t.id}) to the right cost centre through a reclassification entry. The books don’t change until{" "}
          {approver.name} approves and accounting posts it in the ERP.
        </DialogDescription>
      </DialogHeader>

      <div className="grid grid-cols-[minmax(0,1.05fr)_minmax(0,1fr)]">
        <div className="space-y-5 border-r px-6 py-5">
          <div className="grid grid-cols-[1fr_auto_1fr] items-start gap-3">
            <div>
              <div className="mb-1.5 text-[12.5px] font-medium text-muted-foreground">From</div>
              <div className="rounded-lg border bg-muted px-3 py-2 text-[13.5px]">
                <div className="font-semibold">{DEPARTMENTS[from.deptId].name}</div>
                <div className="text-muted-foreground">{lineLabel(from.accountCode)}</div>
              </div>
            </div>
            <ArrowRight className="mt-9 size-4 text-muted-foreground" aria-hidden />
            <div className="space-y-2">
              <div className="text-[12.5px] font-medium text-muted-foreground">To</div>
              <Select
                value={toDept}
                onValueChange={(v) => {
                  const dept = v as DepartmentId
                  setToDept(dept)
                  const codes = ledger.lines.filter((l) => l.deptId === dept).map((l) => l.accountCode)
                  if (!codes.includes(toAccount)) setToAccount(codes[0])
                }}
              >
                <SelectTrigger aria-label="Destination cost centre" className="w-full">
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
              <Select value={toAccount} onValueChange={setToAccount}>
                <SelectTrigger aria-label="Destination GL account" className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {accountsInDept.map((code) => (
                    <SelectItem key={code} value={code}>
                      {lineLabel(code)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          {suggestion && toDept === suggestion.deptId && toAccount === suggestion.accountCode && (
            <p className="-mt-2 text-[12.5px] text-muted-foreground">Pre-filled from {suggestion.poRef}.</p>
          )}
          {touched && errors.to && <p className="-mt-2 text-[12.5px] text-unfav">{errors.to}</p>}

          <div>
            <Label htmlFor="reclass-amount" className="mb-1.5 text-[12.5px] text-muted-foreground">
              Amount
            </Label>
            <div className="relative w-48">
              <span className="pointer-events-none absolute top-1/2 left-3 -translate-y-1/2 text-muted-foreground">€</span>
              <Input
                id="reclass-amount"
                inputMode="decimal"
                value={amountText}
                onChange={(e) => setAmountText(e.target.value)}
                aria-invalid={touched && !!errors.amount}
                className="pl-7"
              />
            </div>
            <p className="mt-1 text-[12.5px] text-muted-foreground">
              {touched && errors.amount ? <span className="text-unfav">{errors.amount}</span> : `Full transaction: ${formatEurExact(t.amount)}`}
            </p>
          </div>

          <fieldset>
            <legend className="mb-2 text-[12.5px] font-medium text-muted-foreground">Reason</legend>
            <RadioGroup value={reason} onValueChange={(v) => setReason(v as ReasonType)} className="grid grid-cols-2 gap-2">
              {(Object.keys(REASON_LABEL) as ReasonType[]).map((r) => (
                <Label
                  key={r}
                  htmlFor={`reason-${r}`}
                  className={cn(
                    "flex cursor-pointer items-center gap-2 rounded-lg border px-3 py-2 text-[13.5px] font-normal",
                    reason === r && "border-brand/50 bg-brand-soft/50 ring-1 ring-brand/30",
                  )}
                >
                  <RadioGroupItem id={`reason-${r}`} value={r} />
                  {REASON_LABEL[r]}
                </Label>
              ))}
            </RadioGroup>
          </fieldset>

          <div>
            <div className="mb-1.5 flex items-baseline justify-between">
              <Label htmlFor="reclass-comment" className="text-[12.5px] text-muted-foreground">
                Explanation for the approver <span className="text-muted-foreground">(required)</span>
              </Label>
              {suggestedComment && comment !== suggestedComment && (
                <button type="button" onClick={() => setComment(suggestedComment)} className="text-[12.5px] font-medium underline underline-offset-4">
                  Use suggested text
                </button>
              )}
            </div>
            <Textarea
              id="reclass-comment"
              value={comment}
              onChange={(e) => setComment(e.target.value)}
              placeholder="Why is the current coding wrong, and how do you know?"
              aria-invalid={touched && !!errors.comment}
              className="min-h-24 text-[13.5px]"
            />
            {touched && errors.comment && <p className="mt-1 text-[12.5px] text-unfav">{errors.comment}</p>}
          </div>

          <fieldset>
            <legend className="mb-2 text-[12.5px] font-medium text-muted-foreground">Evidence</legend>
            <div className="space-y-2">
              {t.attachment && (
                <Label className="flex items-center gap-2.5 text-[13.5px] font-normal">
                  <Checkbox checked={evidence.invoice} onCheckedChange={(c) => setEvidence((e) => ({ ...e, invoice: c === true }))} />
                  Invoice {t.attachment.fileName}
                </Label>
              )}
              {suggestion && (
                <Label className="flex items-center gap-2.5 text-[13.5px] font-normal">
                  <Checkbox checked={evidence.po} onCheckedChange={(c) => setEvidence((e) => ({ ...e, po: c === true }))} />
                  Purchase order {suggestion.poRef} (Sales EMEA)
                </Label>
              )}
              <Button
                variant="ghost"
                size="sm"
                className="-ml-2 text-muted-foreground"
                onClick={() => toast("File upload isn’t part of this prototype")}
              >
                <Paperclip /> Attach another file
              </Button>
            </div>
          </fieldset>
        </div>

        <div className="space-y-5 bg-muted/40 px-6 py-5">
          <section aria-labelledby="impact-title">
            <h3 id="impact-title" className="text-[14px] font-semibold">
              Impact on October variance
            </h3>
            <p className="text-[12.5px] text-muted-foreground">Projected once posted. Actuals today stay as booked.</p>
            {impact.length ? <ImpactTable rows={impact} /> : <p className="mt-3 text-[13px] text-muted-foreground">Complete the destination and amount to see the impact.</p>}
            <p className="mt-3 text-[12.5px] text-muted-foreground">
              Company opex and operating result don’t change: only the split between cost centres moves.
            </p>
          </section>

          <section aria-labelledby="route-title" className="rounded-lg border bg-card px-4 py-3">
            <h3 id="route-title" className="text-[14px] font-semibold">
              Approval
            </h3>
            <div className="mt-2 flex items-center gap-2.5">
              <span className="flex size-8 items-center justify-center rounded-full bg-muted text-[12px] font-semibold">{approver.initials}</span>
              <div>
                <div className="text-[13.5px] font-semibold">{approver.name}</div>
                <div className="text-[12.5px] text-muted-foreground">{approver.role}</div>
              </div>
            </div>
            <p className="mt-2 text-[12.5px] text-muted-foreground">{route.rule}</p>
            <p className="mt-1 text-[12.5px] text-muted-foreground">
              Maker-checker: as the requester, {PEOPLE[CURRENT_USER].name} can’t approve this request.
            </p>
          </section>
        </div>
      </div>

      <DialogFooter className="mx-0 mb-0 items-center rounded-b-xl px-6 py-3.5">
        <span className="mr-auto text-[12.5px] text-muted-foreground">{existing ? `${existing.id} · draft` : "New request"}</span>
        <Button variant="ghost" onClick={() => onOpenChange(false)}>
          Cancel
        </Button>
        <Button variant="outline" onClick={saveDraft}>
          Save draft
        </Button>
        <Button onClick={submit} className="px-4">
          Submit for approval
        </Button>
      </DialogFooter>
    </>
  )
}

function VarCell({ amounts, attention }: { amounts: { actual: number; budget: number }; attention: boolean }) {
  const v = variance(amounts.actual, amounts.budget)
  const fav = isFavourable("expense", v)
  const decimals = rowDecimals(amounts.actual, amounts.budget)
  return (
    <div className="text-right">
      <div className={cn("font-semibold", attention && (fav ? "text-fav" : "text-unfav"))}>
        {formatEur(v, { unit: "k", decimals, signed: true })} <span className="font-normal">{formatPct(variancePct(amounts.actual, amounts.budget))}</span>
      </div>
      <div className="flex items-center justify-end gap-1 text-[11.5px] text-muted-foreground">
        {attention ? (
          <>
            <Flag className="size-3 fill-current" aria-hidden /> {fav ? "Fav" : "Unfav"} · needs attention
          </>
        ) : (
          <>
            <Check className="size-3" aria-hidden /> Within threshold
          </>
        )}
      </div>
    </div>
  )
}

function ImpactTable({ rows }: { rows: ImpactRow[] }) {
  return (
    <table className="mt-3 w-full text-[13px]">
      <thead>
        <tr className="border-b text-[12px] text-muted-foreground">
          <th className="py-1.5 text-left font-medium">Line · October</th>
          <th className="py-1.5 text-right font-medium">Var before</th>
          <th className="py-1.5 text-right font-medium">Var after</th>
        </tr>
      </thead>
      <tbody>
        {rows.map((r) => (
          <tr key={r.key} className={cn("border-b last:border-b-0", r.scope === "department" && "text-muted-foreground")}>
            <td className="py-2 pr-2 align-top">
              <div className="font-medium">{DEPARTMENTS[r.coding.deptId].name}</div>
              <div className="text-[12px] text-muted-foreground">{r.scope === "line" ? lineLabel(r.coding.accountCode) : "Department total"}</div>
            </td>
            <td className="py-2 align-top">
              <VarCell amounts={r.before} attention={r.attentionBefore} />
            </td>
            <td className="py-2 align-top">
              <VarCell amounts={r.after} attention={r.attentionAfter} />
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  )
}
