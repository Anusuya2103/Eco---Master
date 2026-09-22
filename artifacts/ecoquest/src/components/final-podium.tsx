import { AnimalPortrait } from "@/components/animal-portrait";

export interface FinalLeaderboardEntry {
  rank: number;
  playerId: string;
  playerName: string;
  animalId: string;
  position: number;
  ecoScore: number;
  correctAnswers?: number;
}

interface FinalPodiumProps {
  entries: FinalLeaderboardEntry[];
  animals: { id: string; colorPrimary?: string; colorSecondary?: string }[];
}

const rankStyles = [
  "border-yellow-400/60 bg-yellow-400/10",
  "border-slate-300/60 bg-slate-300/10",
  "border-amber-600/60 bg-amber-600/10",
];

export function FinalPodium({ entries, animals }: FinalPodiumProps) {
  const topThree = entries.slice(0, 3);
  if (topThree.length === 0) return null;

  return (
    <section className="w-full max-w-lg" aria-label="Top three finishers">
      <h2 className="text-xs font-bold uppercase tracking-widest text-muted-foreground mb-2">
        Top three finishers
      </h2>
      <div className="grid grid-cols-3 gap-2">
        {topThree.map((entry, index) => {
          const animal = animals.find((candidate) => candidate.id === entry.animalId);
          return (
            <div
              key={entry.playerId}
              className={`min-w-0 rounded-xl border p-2 text-center ${rankStyles[index]}`}
            >
              <div className="text-xs font-bold text-muted-foreground">#{entry.rank}</div>
              <AnimalPortrait
                animalId={entry.animalId || "rabbit"}
                colorPrimary={animal?.colorPrimary}
                colorSecondary={animal?.colorSecondary}
                size={index === 0 ? 40 : 34}
                highlighted={index === 0}
              />
              <p className="mt-1 truncate text-xs font-bold">{entry.playerName}</p>
              <p className="text-[11px] text-muted-foreground">
                Tile {Math.min(100, entry.position + 1)}
              </p>
              <p className="text-[11px] font-semibold text-primary">
                {entry.ecoScore} pts
              </p>
            </div>
          );
        })}
      </div>
    </section>
  );
}