"use client"

import { create } from "zustand"
import { CURRENT_MONTH } from "@/lib/data"

interface FiltersState {
  month: number
  setMonth: (month: number) => void
}

/**
 * Period shared by the dashboard and the GL drill-down, so moving between them keeps the
 * same month. In-memory only: a page reload resets the demo.
 */
export const useFilters = create<FiltersState>((set) => ({
  month: CURRENT_MONTH,
  setMonth: (month) => set({ month }),
}))
