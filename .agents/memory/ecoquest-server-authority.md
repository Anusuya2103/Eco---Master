---
name: EcoQuest server authority
description: Multiplayer state rules that must remain authoritative on the server
---

EcoQuest keeps the host in the room roster for control and reconnect purposes, but the host is never a game participant: scoring, movement, answer counts, winners, and rankings operate on active players only.

**Why:** Treating the host like a player caused incorrect rankings and could let control-plane state affect gameplay.

**How to apply:** When adding a gameplay event or leaderboard, filter out `isHost` records before counting, scoring, sorting, or rendering player tokens.