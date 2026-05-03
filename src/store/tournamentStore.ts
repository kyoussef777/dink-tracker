import { create } from "zustand"

interface TournamentUIState {
  activeBracketId: string | null
  setActiveBracket: (id: string | null) => void
  skillLevelFilter: string | null
  setSkillLevelFilter: (level: string | null) => void
  searchQuery: string
  setSearchQuery: (q: string) => void
}

export const useTournamentStore = create<TournamentUIState>((set) => ({
  activeBracketId: null,
  setActiveBracket: (id) => set({ activeBracketId: id }),
  skillLevelFilter: null,
  setSkillLevelFilter: (level) => set({ skillLevelFilter: level }),
  searchQuery: "",
  setSearchQuery: (q) => set({ searchQuery: q }),
}))
