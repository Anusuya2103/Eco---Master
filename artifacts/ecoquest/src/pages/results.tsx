import { useParams, Link } from "wouter";
import { useGetRoomLeaderboard, useListAnimals } from "@workspace/api-client-react";
import { AnimalPortrait } from "@/components/animal-portrait";
import { Button } from "@/components/ui/button";
import { Loader2 } from "lucide-react";

const PODIUM_COLORS = [
  { bg: "from-yellow-400 to-yellow-500", text: "text-yellow-900", label: "1st Place", ring: "ring-yellow-400" },
  { bg: "from-slate-300 to-slate-400", text: "text-slate-800", label: "2nd Place", ring: "ring-slate-400" },
  { bg: "from-amber-600 to-amber-700", text: "text-amber-100", label: "3rd Place", ring: "ring-amber-600" },
];

function FinishFlagIcon() {
  return (
    <svg viewBox="0 0 64 64" fill="none" xmlns="http://www.w3.org/2000/svg" className="w-16 h-16 mx-auto mb-3">
      <rect x="12" y="8" width="4" height="48" fill="#9ca3af" rx="2" />
      {[0,1,2,3,4,5,6,7].map((i) => (
        <rect
          key={i}
          x={16 + (i % 4) * 8}
          y={8 + Math.floor(i / 4) * 12}
          width={8}
          height={12}
          fill={(Math.floor(i / 4) + (i % 4)) % 2 === 0 ? "white" : "#1a1a2e"}
        />
      ))}
    </svg>
  );
}

export default function ResultsView() {
  const { roomId } = useParams();
  const { data: leaderboard, isLoading } = useGetRoomLeaderboard(roomId || "");
  const { data: animals = [] } = useListAnimals();

  const getAnimal = (animalId: string) => animals.find((a) => a.id === animalId);

  if (isLoading) {
    return (
      <div className="flex h-screen items-center justify-center flex-col gap-3">
        <Loader2 className="animate-spin w-8 h-8 text-primary" />
        <p className="text-muted-foreground text-sm">Loading results…</p>
      </div>
    );
  }

  const top3 = leaderboard?.slice(0, 3) ?? [];
  const rest = leaderboard?.slice(3) ?? [];

  return (
    <div className="min-h-screen bg-background flex flex-col items-center p-6 max-w-3xl mx-auto w-full">
      <div className="text-center mb-10 mt-4">
        <FinishFlagIcon />
        <h1 className="text-4xl md:text-5xl font-bold text-primary">Game Over!</h1>
        <p className="text-muted-foreground mt-2">Final EcoQuest Leaderboard</p>
      </div>

      {/* Podium — top 3 */}
      {top3.length > 0 && (
        <div className="w-full flex gap-3 mb-6 items-end">
          {/* Silver (2nd) */}
          {top3[1] && (() => {
            const animal = getAnimal(top3[1].animalId ?? "");
            return (
              <div className="flex-1 flex flex-col items-center gap-2">
                <AnimalPortrait
                  animalId={top3[1].animalId ?? "rabbit"}
                  colorPrimary={animal?.colorPrimary}
                  colorSecondary={animal?.colorSecondary}
                  size={48}
                />
                <div className="font-semibold text-sm text-center truncate w-full px-1">{top3[1].playerName}</div>
                <div className={`w-full bg-gradient-to-b ${PODIUM_COLORS[1].bg} rounded-t-xl pt-4 pb-3 px-2 text-center`}>
                  <div className={`text-xl font-bold ${PODIUM_COLORS[1].text}`}>Tile {Math.min(100, top3[1].position + 1)}</div>
                  <div className={`text-xs ${PODIUM_COLORS[1].text} opacity-80`}>{top3[1].ecoScore} eco pts</div>
                  <div className={`text-xs font-bold mt-1 ${PODIUM_COLORS[1].text}`}>{PODIUM_COLORS[1].label}</div>
                </div>
              </div>
            );
          })()}

          {/* Gold (1st) — taller */}
          {top3[0] && (() => {
            const animal = getAnimal(top3[0].animalId ?? "");
            return (
              <div className="flex-1 flex flex-col items-center gap-2">
                <AnimalPortrait
                  animalId={top3[0].animalId ?? "eagle"}
                  colorPrimary={animal?.colorPrimary}
                  colorSecondary={animal?.colorSecondary}
                  size={60}
                  highlighted
                />
                <div className="font-bold text-sm text-center truncate w-full px-1">{top3[0].playerName}</div>
                <div className={`w-full bg-gradient-to-b ${PODIUM_COLORS[0].bg} rounded-t-xl pt-6 pb-3 px-2 text-center`}>
                    <div className={`text-2xl font-bold ${PODIUM_COLORS[0].text}`}>Tile {Math.min(100, top3[0].position + 1)}</div>
                  <div className={`text-xs ${PODIUM_COLORS[0].text} opacity-80`}>{top3[0].ecoScore} eco pts</div>
                  <div className={`text-xs font-bold mt-1 ${PODIUM_COLORS[0].text}`}>{PODIUM_COLORS[0].label}</div>
                </div>
              </div>
            );
          })()}

          {/* Bronze (3rd) */}
          {top3[2] && (() => {
            const animal = getAnimal(top3[2].animalId ?? "");
            return (
              <div className="flex-1 flex flex-col items-center gap-2">
                <AnimalPortrait
                  animalId={top3[2].animalId ?? "turtle"}
                  colorPrimary={animal?.colorPrimary}
                  colorSecondary={animal?.colorSecondary}
                  size={48}
                />
                <div className="font-semibold text-sm text-center truncate w-full px-1">{top3[2].playerName}</div>
                <div className={`w-full bg-gradient-to-b ${PODIUM_COLORS[2].bg} rounded-t-xl pt-3 pb-3 px-2 text-center`}>
                  <div className={`text-xl font-bold ${PODIUM_COLORS[2].text}`}>Tile {Math.min(100, top3[2].position + 1)}</div>
                  <div className={`text-xs ${PODIUM_COLORS[2].text} opacity-80`}>{top3[2].ecoScore} eco pts</div>
                  <div className={`text-xs font-bold mt-1 ${PODIUM_COLORS[2].text}`}>{PODIUM_COLORS[2].label}</div>
                </div>
              </div>
            );
          })()}
        </div>
      )}

      {/* Remaining players */}
      {rest.length > 0 && (
        <div className="w-full space-y-2 mb-8">
          {rest.map((entry) => {
            const animal = getAnimal(entry.animalId ?? "");
            return (
              <div
                key={entry.playerId}
                className="flex items-center gap-3 bg-card border rounded-xl px-4 py-3"
              >
                <div className="w-8 h-8 flex items-center justify-center rounded-full bg-muted text-muted-foreground text-sm font-bold shrink-0">
                  #{entry.rank}
                </div>
                <div className="shrink-0">
                  <AnimalPortrait
                    animalId={entry.animalId ?? "rabbit"}
                    colorPrimary={animal?.colorPrimary}
                    colorSecondary={animal?.colorSecondary}
                    size={36}
                  />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="font-semibold truncate">{entry.playerName}</div>
                  <div className="text-xs text-muted-foreground">
                    Tile {Math.min(100, entry.position + 1)} · {entry.correctAnswers} correct
                  </div>
                </div>
                <div className="text-right shrink-0">
                  <div className="font-bold text-primary text-lg">Tile {Math.min(100, entry.position + 1)}</div>
                  <div className="text-xs text-muted-foreground">{entry.ecoScore} eco pts</div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {(!leaderboard || leaderboard.length === 0) && (
        <div className="text-center text-muted-foreground py-12">
          <p>No results found.</p>
          <p className="text-sm mt-1">The room may have expired.</p>
        </div>
      )}

      <Link href="/" className="w-full max-w-xs mt-4">
        <Button size="lg" className="w-full">
          Play Again
        </Button>
      </Link>
    </div>
  );
}
