export const YEAR = 2026

export const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"] as const
export const MONTH_NAMES = [
  "January",
  "February",
  "March",
  "April",
  "May",
  "June",
  "July",
  "August",
  "September",
  "October",
  "November",
  "December",
] as const

/** Index of the reporting month (October). Months before it are closed. */
export const CURRENT_MONTH = 9

export const DATA_STATE = {
  monthIndex: CURRENT_MONTH,
  status: "Provisional" as const,
  closeDay: 3,
  closeDays: 5,
  lastSync: "today 06:00",
}

export function ytdLabel(monthIndex: number): string {
  return `YTD Jan–${MONTHS[monthIndex]}`
}
