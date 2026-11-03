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
      variant="outline"
      className={cn(
        "h-[22px] rounded-full bg-white px-2 text-[12px] font-semibold",
        favourable ? "border-fav text-fav" : "border-unfav text-unfav",
        className,
      )}
    >
      {favourable ? "Fav" : "Unfav"}
      {detail ? ` · ${detail}` : null}
    </Badge>
  )
}

export function favClass(favourable: boolean): string {
  return favourable ? "text-fav" : "text-unfav"
}
