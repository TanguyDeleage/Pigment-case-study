"use client"

import { create } from "zustand"
import { CURRENT_MONTH, type PersonId } from "@/lib/data"

export interface Commentary {
  body: string
  authorId: PersonId
  at: string
}

/** Commentary explains one line's variance for one month. */
export const commentaryKey = (lineId: string, month: number) => `${lineId}@${month}`

/** A cell comment annotates one figure (row × column) for one month's view. */
export const cellCommentKey = (rowId: string, month: number, columnId: string) => `${rowId}@${month}#${columnId}`

interface CommentaryState {
  byKey: Record<string, Commentary>
  save: (key: string, commentary: Commentary | null) => void
}

/** In-memory only: a page reload resets the demo. */
export const useCommentary = create<CommentaryState>((set) => ({
  byKey: {
    [commentaryKey("rnd:6226", CURRENT_MONTH)]: {
      body: "Two extra contractors on the data platform migration, approved by Julien. Ends in November.",
      authorId: "julien",
      at: "2026-11-02T10:15:00",
    },
  },
  save: (key, commentary) =>
    set((s) => {
      const byKey = { ...s.byKey }
      if (commentary) byKey[key] = commentary
      else delete byKey[key]
      return { byKey }
    }),
}))
