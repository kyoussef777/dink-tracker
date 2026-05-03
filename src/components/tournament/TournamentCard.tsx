import Link from "next/link"
import { Card, CardContent, CardFooter, CardHeader } from "@/components/ui/card"
import { StatusBadge } from "@/components/shared/StatusBadge"
import { formatDateRange } from "@/lib/utils"
import { Calendar, MapPin, Trophy } from "lucide-react"
import type { Tournament, TournamentStatus } from "@prisma/client"

type Props = {
  tournament: Tournament & { _count?: { brackets: number } }
}

export function TournamentCard({ tournament }: Props) {
  return (
    <Link
      href={`/tournaments/${tournament.id}`}
      className="group block rounded-xl outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
    >
      <Card className="h-full transition-all hover:border-primary/50 hover:shadow-md">
        <CardHeader className="space-y-3 pb-4">
          <div className="flex items-start justify-between gap-2">
            <h3 className="text-lg font-semibold leading-tight tracking-tight group-hover:text-primary transition-colors">
              {tournament.name}
            </h3>
            <StatusBadge kind="tournament" status={tournament.status as TournamentStatus} />
          </div>
          {tournament.description && (
            <p className="text-sm text-muted-foreground line-clamp-2">{tournament.description}</p>
          )}
        </CardHeader>
        <CardContent className="space-y-2 pb-4 text-sm">
          <div className="flex items-center gap-2 text-muted-foreground">
            <Calendar className="h-4 w-4 shrink-0" />
            <span>{formatDateRange(tournament.startDate, tournament.endDate)}</span>
          </div>
          {tournament.venue && (
            <div className="flex items-center gap-2 text-muted-foreground">
              <MapPin className="h-4 w-4 shrink-0" />
              <span className="truncate">{tournament.venue}</span>
            </div>
          )}
        </CardContent>
        <CardFooter className="border-t pt-4">
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Trophy className="h-4 w-4" />
            <span>
              {tournament._count?.brackets ?? 0} {(tournament._count?.brackets ?? 0) === 1 ? "bracket" : "brackets"}
            </span>
          </div>
        </CardFooter>
      </Card>
    </Link>
  )
}
