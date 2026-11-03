/**
 * Hand-written October transactions for the lines in Léa's story,
 * plus the purchase order and vendor default that explain the miscoding.
 */
import type { PurchaseOrder, Transaction, VendorDefault } from "./types"

export const ATELIER_NORD_TX_ID = "JE-2026-10-04418"

export const STORY_TRANSACTIONS: Transaction[] = [
  // Marketing · 6233 Events & trade shows: €82.0k
  {
    id: ATELIER_NORD_TX_ID,
    lineId: "marketing:6233",
    postingDate: "2026-10-21",
    vendor: "Atelier Nord",
    description: "Stand design & build, Lisbon, 15–16 Oct",
    amount: 48_000,
    codingSource: "vendor_default",
    invoiceRef: "INV-AN-2026-1042",
    attachment: {
      fileName: "INV-AN-2026-1042.pdf",
      sizeKb: 182,
      invoiceNumber: "INV-AN-2026-1042",
      issuedOn: "2026-10-18",
      lines: [
        { description: "Stand design, 36 m² island, EMEA Sales Summit Lisbon", amount: 14_500 },
        { description: "Build, transport and on-site assembly (15–16 Oct)", amount: 27_300 },
        { description: "AV rental and dismantling", amount: 6_200 },
      ],
      note: "Your ref: M. Lefèvre, Sales EMEA",
    },
    comments: [
      {
        id: "c1",
        authorId: "thomas",
        at: "2026-11-02T17:42:00",
        body: "Marketing didn't run anything with Atelier Nord this quarter. Is this ours?",
      },
    ],
  },
  {
    id: "JE-2026-10-04102",
    lineId: "marketing:6233",
    postingDate: "2026-10-07",
    vendor: "Halle Parc Expo",
    description: "Webinar studio hire, Q4 series",
    amount: 18_500,
    codingSource: "po_match",
    invoiceRef: "HPE-88213",
    poRef: "PO-2026-0841",
  },
  {
    id: "JE-2026-10-04230",
    lineId: "marketing:6233",
    postingDate: "2026-10-12",
    vendor: "Merch Lab",
    description: "Branded merchandise, webinar attendees",
    amount: 5_800,
    codingSource: "po_match",
    invoiceRef: "ML-2026-311",
    poRef: "PO-2026-0866",
  },
  {
    id: "JE-2026-10-04291",
    lineId: "marketing:6233",
    postingDate: "2026-10-14",
    vendor: "Studio Lumen",
    description: "Event photography",
    amount: 4_000,
    codingSource: "vendor_default",
    invoiceRef: "SL-1187",
  },
  {
    id: "JE-2026-10-04317",
    lineId: "marketing:6233",
    postingDate: "2026-10-15",
    vendor: "Pixel Print Co",
    description: "Roll-ups and flyers",
    amount: 3_100,
    codingSource: "recurring",
    invoiceRef: "PPC-20931",
  },
  {
    id: "JE-2026-10-04350",
    lineId: "marketing:6233",
    postingDate: "2026-10-17",
    vendor: "Event Ticketing Ltd",
    description: "Webinar platform fees",
    amount: 2_600,
    codingSource: "recurring",
    invoiceRef: "ETL-7765",
  },
  // Sales EMEA · 6233 Events & trade shows: €5.0k
  {
    id: "JE-2026-10-04188",
    lineId: "sales-emea:6233",
    postingDate: "2026-10-09",
    vendor: "Event Ticketing Ltd",
    description: "Summit registration platform",
    amount: 1_800,
    codingSource: "po_match",
    invoiceRef: "ETL-7712",
    poRef: "PO-2026-0921",
  },
  {
    id: "JE-2026-10-04264",
    lineId: "sales-emea:6233",
    postingDate: "2026-10-13",
    vendor: "Pixel Print Co",
    description: "Summit badges and signage",
    amount: 3_200,
    codingSource: "po_match",
    invoiceRef: "PPC-20918",
    poRef: "PO-2026-0924",
  },
  // R&D · 6226 Contractor & advisory fees: €266k
  {
    id: "JE-2026-10-04011",
    lineId: "rnd:6226",
    postingDate: "2026-10-03",
    vendor: "Lumen Advisory",
    description: "Security audit, phase 2",
    amount: 120_000,
    codingSource: "po_match",
    invoiceRef: "LA-2026-044",
    poRef: "PO-2026-0790",
  },
  {
    id: "JE-2026-10-04145",
    lineId: "rnd:6226",
    postingDate: "2026-10-08",
    vendor: "Kestrel Data Labs",
    description: "Data platform contractors, October",
    amount: 86_000,
    codingSource: "recurring",
    invoiceRef: "KDL-1029",
  },
  {
    id: "JE-2026-10-04377",
    lineId: "rnd:6226",
    postingDate: "2026-10-20",
    vendor: "Northfield Consulting",
    description: "Mobile app contractors, October",
    amount: 60_000,
    codingSource: "recurring",
    invoiceRef: "NC-3301",
  },
]

export const PURCHASE_ORDERS: PurchaseOrder[] = [
  {
    ref: "PO-2026-0917",
    vendor: "Atelier Nord",
    amount: 48_000,
    deptId: "sales-emea",
    accountCode: "6233",
    requesterId: "marc",
    raisedOn: "2026-08-28",
    description: "EMEA Sales Summit Lisbon: stand design & build",
    matchNotes: ["Invoice reference names the Sales EMEA events lead", "Summit dates match the invoice"],
  },
]

export const VENDOR_DEFAULTS: VendorDefault[] = [
  {
    vendor: "Atelier Nord",
    deptId: "marketing",
    accountCode: "6233",
    since: "2025-03-12",
    origin: "first invoice, Marketing's Paris SaaS Expo stand",
  },
]

/** Jan–Sep vendor totals on Marketing · 6233 (euros); they sum to the line's closed actuals. */
export const MARKETING_6233_VENDOR_HISTORY: Record<string, number> = {
  "Halle Parc Expo": 520_000,
  "Merch Lab": 210_000,
  "Pixel Print Co": 160_000,
  "Studio Lumen": 120_000,
  "Event Ticketing Ltd": 95_000,
  "Other vendors (12)": 125_000,
}

export interface BudgetNote {
  source: string
  note: string
  verdict: string
}

/** Budget-side context for the "check the budget first" step of the investigation. */
export const BUDGET_NOTES: Record<string, BudgetNote> = {
  "marketing:6233": {
    source: "FY2026 events plan v3, approved 15 Dec 2025",
    note: "October is phased low on purpose: Marketing only planned the Q4 webinar series. The EMEA Sales Summit in Lisbon (15–16 Oct) sits in the Sales EMEA budget.",
    verdict: "Budget phasing matches the plan. The gap comes from actuals.",
  },
  "sales-emea:6233": {
    source: "FY2026 events plan v3, approved 15 Dec 2025",
    note: "October carries €50k for the EMEA Sales Summit in Lisbon: stand, AV and signage.",
    verdict: "Budget phasing matches the plan. Most summit costs have not landed here.",
  },
}

export const DEFAULT_BUDGET_NOTE: BudgetNote = {
  source: "FY2026 budget v2, approved Dec 2025",
  note: "Phased evenly across the year, adjusted for headcount plan and known contracts.",
  verdict: "No phasing anomaly detected for this month.",
}

export const VENDOR_HISTORY: Record<string, Record<string, number>> = {
  "marketing:6233": MARKETING_6233_VENDOR_HISTORY,
}
