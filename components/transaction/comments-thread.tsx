"use client"

import { useState } from "react"
import { MessageSquare } from "lucide-react"
import { CURRENT_USER, PEOPLE, type Comment, type PersonId } from "@/lib/data"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"

const timeFmt = new Intl.DateTimeFormat("en-GB", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" })

function when(at: string): string {
  return Date.now() - new Date(at).getTime() < 60_000 ? "just now" : timeFmt.format(new Date(at))
}

const AVATAR_TONES = [
  "bg-sky-100 text-sky-800",
  "bg-violet-100 text-violet-800",
  "bg-emerald-100 text-emerald-800",
  "bg-amber-100 text-amber-800",
  "bg-rose-100 text-rose-800",
]

function Avatar({ personId }: { personId: PersonId }) {
  const tone = AVATAR_TONES[[...personId].reduce((s, c) => s + c.charCodeAt(0), 0) % AVATAR_TONES.length]
  return (
    <span className={`flex size-7 shrink-0 items-center justify-center rounded-full text-[11px] font-semibold ${tone}`}>
      {PEOPLE[personId].initials}
    </span>
  )
}

/** Local to the open panel; the prototype doesn't persist new comments across reloads. */
export function CommentsThread({ initial }: { initial: Comment[] }) {
  const [comments, setComments] = useState(initial)
  const [draft, setDraft] = useState("")

  const post = () => {
    if (!draft.trim()) return
    setComments((c) => [...c, { id: `local-${c.length}`, authorId: CURRENT_USER, at: new Date().toISOString(), body: draft.trim() }])
    setDraft("")
  }

  return (
    <div>
      <ul className="space-y-4">
        {comments.map((c) => (
          <li key={c.id} className="flex gap-2.5">
            <Avatar personId={c.authorId} />
            <div className="min-w-0">
              <div className="text-[12.5px]">
                <span className="font-semibold">{PEOPLE[c.authorId].name}</span>
                <span className="text-muted-foreground">
                  {" "}
                  · {when(c.at)}
                </span>
              </div>
              <p className="mt-0.5 text-[13.5px] text-foreground">{c.body}</p>
            </div>
          </li>
        ))}
      </ul>
      <div className="mt-4 flex gap-2.5">
        <Avatar personId={CURRENT_USER} />
        <div className="flex-1">
          <Textarea
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            placeholder="Reply or @mention someone"
            aria-label="Add a comment"
            className="min-h-14 text-[13.5px]"
          />
          <div className="mt-2 flex justify-end">
            <Button size="lg" variant="outline" onClick={post} disabled={!draft.trim()}>
              <MessageSquare /> Comment
            </Button>
          </div>
        </div>
      </div>
    </div>
  )
}
