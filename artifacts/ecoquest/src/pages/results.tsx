import { useParams, Link } from "wouter";
import { useGetRoomLeaderboard, useListAnimals } from "@workspace/api-client-react";
import { AnimalPortrait } from "@/components/animal-portrait";
import { Button } from "@/components/ui/button";
import { Loader2, Trophy, Crown } from "lucide-react";

type LeaderboardEntry = {
  rank: number;
  playerId: string;
  playerName: string;
  animalId: string;
  position: number;
  ecoScore: number;
  correctAnswers?: number;
};

const podiumPlaces = [
  {
    rank: 2,
    label: "II",
    barHeight: "h-28 sm:h-32",
    barClass: "bg-[#7d8791]",
    textClass: "text-white",
    nameClass: "text-[#1e293b]",
  },
  {
    rank: 1,
    label: "I",
    barHeight: "h-40 sm:h-44",
    barClass: "bg-[#4b4850]",
    textClass: "text-[#f5c451]",
    nameClass: "text-[#1e293b]",
  },
  {
    rank: 3,
    label: "III",
    barHeight: "h-24 sm:h-28",
    barClass: "bg-[#c76a35]",
    textClass: "text-[#ffe2cf]",
    nameClass: "text-[#1e293b]",
  },
] as const;

function getCell(position: number) {
  return Math.min(100, Math.max(1, position + 1));
}

function podiumEntry(
  entries: LeaderboardEntry[],
  rank: number,
): LeaderboardEntry | undefined {
  return entries.find((entry) => entry.rank === rank);
}

function PodiumColumn({
  entry,
  rank,
  label,
  barHeight,
  barClass,
  textClass,
  nameClass,
  animal,
}: {
  entry?: LeaderboardEntry;
  rank: number;
  label: string;
  barHeight: string;
  barClass: string;
  textClass: string;
  nameClass: string;
  animal?: { id: string; colorPrimary?: string; colorSecondary?: string };
}) {
  if (!entry) {
    return <div className="flex-1 min-w-0" aria-hidden="true" />;
  }

  const winner = rank === 1;

  return (
    <div className="flex min-w-0 flex-1 flex-col items-center justify-end">
      <AnimalPortrait
        animalId={entry.animalId || "rabbit"}
        colorPrimary={animal?.colorPrimary}
        colorSecondary={animal?.colorSecondary}
        size={winner ? 68 : 58}
        highlighted={winner}
        className="mb-2"
      />
      <p className={`mb-1 max-w-full truncate px-1 text-center text-lg font-bold sm:text-xl ${nameClass}`}>
        {entry.playerName}
      </p>
      <div className="mb-2 flex items-center gap-1 text-sm font-semibold text-[#34343a]">
        {winner && <Crown className="h-4 w-4 fill-[#e7b642] text-[#c99116]" aria-hidden="true" />}
        <span>FINISHED: Cell {getCell(entry.position)}</span>
      </div>
      <div className={`flex w-full flex-col items-center justify-end ${barHeight} ${barClass} px-2 pb-3 pt-4 shadow-[inset_0_1px_0_rgba(255,255,255,0.2)]`}>
        <div className={`text-4xl font-black leading-none sm:text-5xl ${textClass}`}>{label}</div>
        <div className={`mt-2 text-center text-xs font-semibold sm:text-sm ${textClass}`}>
          {entry.ecoScore} eco pts
        </div>
      </div>
    </div>
  );
}

export default function ResultsView() {
  const { roomId } = useParams();
  const { data: leaderboard, isLoading } = useGetRoomLeaderboard(roomId || "");
  const { data: animals = [] } = useListAnimals();

  const entries = (leaderboard ?? []) as LeaderboardEntry[];
  const totalCorrectAnswers = entries.reduce(
    (total, entry) => total + (entry.correctAnswers ?? 0),
    0,
  );
  const getAnimal = (animalId: string) =>
    animals.find((animal) => animal.id === animalId);

  if (isLoading) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center gap-3 bg-[#f7faf7]">
        <Loader2 className="h-8 w-8 animate-spin text-[#237e58]" />
        <p className="text-sm text-slate-500">Loading results…</p>
      </div>
    );
  }

  const topThree = podiumPlaces.map((place) => ({
    ...place,
    entry: podiumEntry(entries, place.rank),
  }));
  const remainingPlayers = entries.filter((entry) => entry.rank > 3);

  return (
    <main className="min-h-screen bg-[#f7faf7] px-4 py-5 text-[#202124] sm:px-8 sm:py-8">
      <div className="mx-auto flex w-full max-w-3xl flex-col items-center">
        <header className="text-center">
          <h1 className="text-4xl font-extrabold tracking-tight text-[#237e58] sm:text-5xl">
            RESULTS
          </h1>
          <div className="mt-2 flex items-center justify-center gap-2 text-2xl font-extrabold uppercase sm:text-3xl">
            <Trophy className="h-7 w-7 fill-[#e9b83f] text-[#a76b17] sm:h-8 sm:w-8" aria-hidden="true" />
            <span>GAME OVER!</span>
            <Trophy className="h-7 w-7 fill-[#e9b83f] text-[#a76b17] sm:h-8 sm:w-8" aria-hidden="true" />
          </div>
        </header>

        {entries.length > 0 ? (
          <>
            <section
              className="mt-9 flex w-full items-end gap-2 sm:mt-12 sm:gap-4"
              aria-label="Final podium"
            >
              {topThree.map((place) => (
                <PodiumColumn
                  key={place.rank}
                  entry={place.entry}
                  rank={place.rank}
                  label={place.label}
                  barHeight={place.barHeight}
                  barClass={place.barClass}
                  textClass={place.textClass}
                  nameClass={place.nameClass}
                  animal={place.entry ? getAnimal(place.entry.animalId) : undefined}
                />
              ))}
            </section>

            {remainingPlayers.length > 0 && (
              <section className="mt-6 w-full space-y-2" aria-label="Remaining players">
                {remainingPlayers.map((entry) => {
                  const animal = getAnimal(entry.animalId);
                  return (
                    <div
                      key={entry.playerId}
                      className="flex items-center gap-3 rounded-xl border border-[#dbe7df] bg-white px-4 py-3 shadow-sm"
                    >
                      <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-[#edf4ee] text-sm font-bold text-[#52705f]">
                        {entry.rank}
                      </span>
                      <AnimalPortrait
                        animalId={entry.animalId || "rabbit"}
                        colorPrimary={animal?.colorPrimary}
                        colorSecondary={animal?.colorSecondary}
                        size={38}
                      />
                      <div className="min-w-0 flex-1">
                        <p className="truncate font-bold">{entry.playerName}</p>
                        <p className="text-xs text-slate-500">
                          Cell {getCell(entry.position)} · {entry.correctAnswers ?? 0} correct
                        </p>
                      </div>
                      <div className="shrink-0 text-right">
                        <p className="font-bold text-[#237e58]">Cell {getCell(entry.position)}</p>
                        <p className="text-xs text-slate-500">{entry.ecoScore} eco pts</p>
                      </div>
                    </div>
                  );
                })}
              </section>
            )}

            <section className="mt-8 flex w-full items-center justify-center gap-10 text-center sm:gap-24">
              <div>
                <p className="text-2xl font-medium text-[#202124] sm:text-3xl">
                  {entries.length}
                </p>
                <p className="text-sm text-slate-500 sm:text-base">Players</p>
              </div>
              <div>
                <p className="text-2xl font-medium text-[#202124] sm:text-3xl">
                  {totalCorrectAnswers}
                </p>
                <p className="text-sm text-slate-500 sm:text-base">Correct answers</p>
              </div>
            </section>
          </>
        ) : (
          <div className="mt-16 rounded-2xl border border-dashed border-[#cbd9ce] bg-white px-8 py-12 text-center text-slate-500">
            <p>No results found.</p>
            <p className="mt-1 text-sm">The room may have expired.</p>
          </div>
        )}

        <Link href="/" className="mt-8 w-full max-w-xs">
          <Button className="h-12 w-full rounded-xl bg-[#319866] text-lg font-bold uppercase tracking-wide text-white shadow-sm hover:bg-[#277e53]">
            Return to Lobby
          </Button>
        </Link>
      </div>
    </main>
  );
}