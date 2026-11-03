import type { LineType } from "@/lib/finance/variance"

export type DepartmentId =
  | "marketing"
  | "sales-emea"
  | "rnd"
  | "sales-americas"
  | "customer-success"
  | "g-and-a"
  | "people"

export interface Department {
  id: DepartmentId
  name: string
  ownerId: PersonId
}

export interface Account {
  code: string
  name: string
  type: LineType
}

/** A ledger line: one GL account in one cost centre (revenue lines have no cost centre). */
export interface Line {
  id: string
  deptId: DepartmentId | null
  accountCode: string
  lineType: LineType
}

export type PersonId = "lea" | "claire" | "sophie" | "thomas" | "marc" | "julien" | "nadia" | "hugo" | "ines" | "paul"

export interface Person {
  id: PersonId
  name: string
  role: string
  initials: string
}

export type CodingSource = "vendor_default" | "po_match" | "recurring" | "manual"

export interface Comment {
  id: string
  authorId: PersonId
  at: string
  body: string
}

export interface InvoiceAttachment {
  fileName: string
  sizeKb: number
  invoiceNumber: string
  issuedOn: string
  lines: { description: string; amount: number }[]
  note?: string
}

export interface Transaction {
  id: string
  lineId: string
  postingDate: string
  vendor: string
  description: string
  /** Whole euros. */
  amount: number
  codingSource: CodingSource
  invoiceRef?: string
  poRef?: string
  attachment?: InvoiceAttachment
  comments?: Comment[]
}

export interface PurchaseOrder {
  ref: string
  vendor: string
  amount: number
  deptId: DepartmentId
  accountCode: string
  requesterId: PersonId
  raisedOn: string
  description: string
  /** Story-specific signals shown when the PO is suggested as a match. */
  matchNotes: string[]
}

export interface VendorDefault {
  vendor: string
  deptId: DepartmentId
  accountCode: string
  since: string
  origin: string
}

/** Monthly amounts, Jan..Dec, whole euros. */
export type Monthly = number[]

export interface Ledger {
  lines: Line[]
  /** Phased budget per line, 12 months. */
  budget: Record<string, Monthly>
  /** Closed-month actual balances per line (Jan..Sep). */
  closedActuals: Record<string, Monthly>
  /** Provisional-month transactions (October). */
  transactions: Transaction[]
}
