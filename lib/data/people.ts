import type { Person, PersonId } from "./types"

export const PEOPLE: Record<PersonId, Person> = {
  lea: { id: "lea", name: "Léa Martin", role: "FP&A analyst", initials: "LM" },
  claire: { id: "claire", name: "Claire Dubois", role: "Financial controller", initials: "CD" },
  sophie: { id: "sophie", name: "Sophie Laurent", role: "CFO", initials: "SL" },
  thomas: { id: "thomas", name: "Thomas Moreau", role: "Head of Marketing", initials: "TM" },
  marc: { id: "marc", name: "Marc Lefèvre", role: "Events lead, Sales EMEA", initials: "ML" },
  julien: { id: "julien", name: "Julien Petit", role: "VP Engineering", initials: "JP" },
  nadia: { id: "nadia", name: "Nadia Benali", role: "VP Sales Americas", initials: "NB" },
  hugo: { id: "hugo", name: "Hugo Bernard", role: "Head of Customer Success", initials: "HB" },
  ines: { id: "ines", name: "Inès Garnier", role: "Head of People", initials: "IG" },
  paul: { id: "paul", name: "Paul Roux", role: "VP Sales EMEA", initials: "PR" },
}

/** The signed-in user: the prototype is Léa's journey. */
export const CURRENT_USER: PersonId = "lea"
