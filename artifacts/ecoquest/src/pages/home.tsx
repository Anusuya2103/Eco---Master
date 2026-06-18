import { useState } from "react";
import { useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { audio } from "@/lib/audio";
import { Volume2, VolumeX } from "lucide-react";

export default function Home() {
  const [, setLocation] = useLocation();
  const [hostName, setHostName] = useState("");
  const [roomCode, setRoomCode] = useState("");
  const { toast } = useToast();
  const [isMuted, setIsMuted] = useState(audio.getMuted());

  const handleCreateRoom = () => {
    if (!hostName.trim()) {
      toast({ title: "Name required", variant: "destructive" });
      return;
    }
    setLocation(`/host?hostName=${encodeURIComponent(hostName.trim())}`);
  };

  const handleJoinRoom = () => {
    if (!roomCode.trim()) {
      toast({ title: "Room code required", variant: "destructive" });
      return;
    }
    setLocation(`/play/${roomCode.trim().toUpperCase()}`);
  };

  const toggleMute = () => {
    setIsMuted(audio.toggleMute());
  };

  return (
    <div className="min-h-[100dvh] w-full flex flex-col items-center justify-center bg-background map-bg p-4 relative overflow-hidden">
      <div className="absolute top-4 right-4 z-50">
        <Button variant="outline" size="icon" onClick={toggleMute}>
          {isMuted ? <VolumeX className="h-4 w-4" /> : <Volume2 className="h-4 w-4" />}
        </Button>
      </div>
      
      <div className="text-center mb-8 z-10">
        <h1 className="text-5xl md:text-7xl font-bold text-primary tracking-tight mb-4">
          EcoQuest
        </h1>
        <p className="text-lg text-muted-foreground max-w-md mx-auto">
          A real-time multiplayer eco-survival board game. Race across 100 tiles by answering environmental science questions!
        </p>
      </div>

      <div className="grid md:grid-cols-2 gap-6 w-full max-w-4xl z-10">
        <Card className="border-2 border-primary/20 shadow-xl bg-card/95 backdrop-blur">
          <CardHeader>
            <CardTitle className="text-2xl text-primary">Host a Game</CardTitle>
            <CardDescription>Create a new room and display the board for everyone to join.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="hostName">Your Name</Label>
              <Input 
                id="hostName" 
                placeholder="Teacher/Host Name" 
                value={hostName}
                onChange={(e) => setHostName(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && handleCreateRoom()}
              />
            </div>
          </CardContent>
          <CardFooter>
            <Button 
              className="w-full text-lg h-12" 
              onClick={handleCreateRoom}
            >
              Create Room
            </Button>
          </CardFooter>
        </Card>

        <Card className="border-2 border-secondary/20 shadow-xl bg-card/95 backdrop-blur">
          <CardHeader>
            <CardTitle className="text-2xl text-secondary">Join a Game</CardTitle>
            <CardDescription>Enter a room code to join an existing game as a player.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="roomCode">Room Code</Label>
              <Input 
                id="roomCode" 
                placeholder="e.g. A1B2C3" 
                className="uppercase"
                value={roomCode}
                onChange={(e) => setRoomCode(e.target.value.toUpperCase())}
                onKeyDown={(e) => e.key === "Enter" && handleJoinRoom()}
              />
            </div>
          </CardContent>
          <CardFooter>
            <Button 
              variant="secondary" 
              className="w-full text-lg h-12"
              onClick={handleJoinRoom}
            >
              Join Game
            </Button>
          </CardFooter>
        </Card>
      </div>
    </div>
  );
}
