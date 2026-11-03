import { cn } from "@/lib/utils"
import { Badge } from "@/components/ui/badge"

interface FavBadgeProps {
  favourable: boolean
  /** Extra wording after Fav/Unfav, e.g. "over budget". */
  detail?: string
  className?: string
}

/** Colour always comes with a word: Fav / Unfav. */
export function FavBadge({ favourable, detail, className }: FavBadgeProps) {
  return (
    <Badge
      className={cn(
        "gap-1.5 font-medium",
        favourable ? "bg-fav-soft text-fav" : "bg-unfav-soft text-unfav",
        className,
      )}
    >
      <span className={cn("size-1.5 rounded-full", favourable ? "bg-fav" : "bg-unfav")} aria-hidden />
      {favourable ? "Fav" : "Unfav"}
      {detail ? ` · ${detail}` : null}
    </Badge>
  )
}

export function favClass(favourable: boolean): string {
  return favourable ? "text-fav" : "text-unfav"
}
