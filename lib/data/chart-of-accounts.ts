import type { Account, Department, DepartmentId } from "./types"

export const ACCOUNTS: Record<string, Account> = {
  "7061": { code: "7061", name: "Subscription revenue", type: "revenue" },
  "7062": { code: "7062", name: "Professional services", type: "revenue" },
  "7088": { code: "7088", name: "Other revenue", type: "revenue" },
  "6064": { code: "6064", name: "Equipment & supplies", type: "expense" },
  "6132": { code: "6132", name: "Office rent", type: "expense" },
  "6135": { code: "6135", name: "Software subscriptions", type: "expense" },
  "6156": { code: "6156", name: "Cloud hosting", type: "expense" },
  "6161": { code: "6161", name: "Insurance", type: "expense" },
  "6222": { code: "6222", name: "Sales commissions", type: "expense" },
  "6226": { code: "6226", name: "Contractor & advisory fees", type: "expense" },
  "6227": { code: "6227", name: "Legal fees", type: "expense" },
  "6231": { code: "6231", name: "Advertising", type: "expense" },
  "6233": { code: "6233", name: "Events & trade shows", type: "expense" },
  "6236": { code: "6236", name: "Printed materials", type: "expense" },
  "6251": { code: "6251", name: "Travel", type: "expense" },
  "6257": { code: "6257", name: "Client meals & receptions", type: "expense" },
  "6262": { code: "6262", name: "Telecoms", type: "expense" },
  "6288": { code: "6288", name: "Recruitment fees", type: "expense" },
  "6333": { code: "6333", name: "Training", type: "expense" },
  "6411": { code: "6411", name: "Salaries", type: "expense" },
  "6451": { code: "6451", name: "Social charges", type: "expense" },
}

export const DEPARTMENTS: Record<DepartmentId, Department> = {
  marketing: { id: "marketing", name: "Marketing", ownerId: "thomas" },
  "sales-emea": { id: "sales-emea", name: "Sales EMEA", ownerId: "paul" },
  rnd: { id: "rnd", name: "R&D", ownerId: "julien" },
  "sales-americas": { id: "sales-americas", name: "Sales Americas", ownerId: "nadia" },
  "customer-success": { id: "customer-success", name: "Customer Success", ownerId: "hugo" },
  "g-and-a": { id: "g-and-a", name: "G&A", ownerId: "sophie" },
  people: { id: "people", name: "People", ownerId: "ines" },
}

/** Display order in tables and the waterfall. */
export const DEPARTMENT_ORDER: DepartmentId[] = [
  "marketing",
  "sales-emea",
  "rnd",
  "sales-americas",
  "customer-success",
  "g-and-a",
  "people",
]

export const REVENUE_ACCOUNTS = ["7061", "7062", "7088"]

export function lineId(deptId: DepartmentId | null, accountCode: string): string {
  return `${deptId ?? "revenue"}:${accountCode}`
}

export function lineLabel(accountCode: string): string {
  return `${accountCode} ${ACCOUNTS[accountCode].name}`
}
