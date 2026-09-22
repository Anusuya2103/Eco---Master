import { io } from "socket.io-client";

const apiUrl = process.env.ECOQUEST_API_URL || "http://127.0.0.1:8080";
const socketOptions = {
  path: "/socket.io",
  transports: ["websocket"],
  reconnection: false,
};

const wait = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

function connect(name) {
  const socket = io(apiUrl, socketOptions);
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error(`${name} connect timeout`)), 5000);
    socket.once("connect", () => {
      clearTimeout(timer);
      resolve(socket);
    });
    socket.once("connect_error", reject);
  });
}

function event(socket, name, timeout = 7000) {
  return new Promise((resolve, reject) => {
    const onEvent = (data) => {
      clearTimeout(timer);
      resolve(data);
    };
    const timer = setTimeout(() => {
      socket.off(name, onEvent);
      reject(new Error(`${name} timeout`));
    }, timeout);
    socket.once(name, onEvent);
  });
}

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

let host;
let playerOne;
let playerTwo;
let roomId;
let roomCode;
let playerToken;

try {
  host = await connect("host");
  host.emit("create_room", { hostName: "QA Host" });
  const created = await event(host, "room_created");
  ({ roomId, roomCode } = created);

  playerOne = await connect("player-one");
  playerOne.emit("join_room", {
    roomCode,
    playerName: "Player One",
    animalId: "rabbit",
  });
  const joinedOne = await event(playerOne, "room_joined");
  playerToken = joinedOne.rejoinToken;

  playerTwo = await connect("player-two");
  playerTwo.emit("join_room", {
    roomCode,
    playerName: "Player Two",
    animalId: "fox",
  });
  await event(playerTwo, "room_joined");
  assert(joinedOne.players.some((player) => player.isHost), "host missing from roster");

  host.emit("start_game", { roomId });
  const firstQuestion = await event(playerOne, "question");
  await event(playerTwo, "question");
  assert(
    firstQuestion.remainingTime > 0 &&
      firstQuestion.remainingTime <= firstQuestion.timeLimit,
    "question did not include an authoritative timer"
  );

  const firstResultPromise = event(host, "round_result");
  playerOne.emit("submit_answer", {
    roomId,
    questionId: firstQuestion.questionId,
    answerIndex: 0,
  });
  playerTwo.emit("submit_answer", {
    roomId,
    questionId: firstQuestion.questionId,
    answerIndex: 0,
  });
  const firstResult = await firstResultPromise;
  assert(
    firstResult.playerResults.every((result) => result.playerId !== created.playerId),
    "host was processed as a player"
  );
  assert(firstResult.leaderboard.length === 2, "host appeared in the leaderboard");
  assert(
    firstResult.leaderboard.every(
      (entry, index, leaderboard) =>
        index === 0 ||
        leaderboard[index - 1].position > entry.position ||
        (leaderboard[index - 1].position === entry.position &&
          leaderboard[index - 1].ecoScore >= entry.ecoScore)
    ),
    "leaderboard is not position-first"
  );

  const secondQuestion = await event(playerOne, "question");
  playerOne.disconnect();
  await wait(350);
  const rejoinedPlayer = await connect("player-one-rejoin");
  rejoinedPlayer.emit("rejoin_player", {
    roomCode,
    playerName: "Player One",
    rejoinToken: playerToken,
  });
  const playerRejoined = await event(rejoinedPlayer, "player_rejoined");
  assert(
    playerRejoined.currentQuestion &&
      playerRejoined.currentQuestion.remainingTime < secondQuestion.timeLimit &&
      playerRejoined.currentQuestion.remainingTime > 0,
    "player rejoin did not restore the live remaining time"
  );
  playerOne = rejoinedPlayer;

  const secondResultPromise = event(host, "round_result");
  playerOne.emit("submit_answer", {
    roomId,
    questionId: secondQuestion.questionId,
    answerIndex: 0,
  });
  playerTwo.emit("submit_answer", {
    roomId,
    questionId: secondQuestion.questionId,
    answerIndex: 0,
  });
  await secondResultPromise;

  const thirdQuestion = await event(host, "question");
  host.disconnect();
  await wait(350);
  const rejoinedHost = await connect("host-rejoin");
  rejoinedHost.emit("rejoin_host", { roomCode });
  const hostRejoined = await event(rejoinedHost, "host_rejoined");
  assert(
    hostRejoined.currentQuestion &&
      hostRejoined.currentQuestion.remainingTime < thirdQuestion.timeLimit &&
      hostRejoined.currentQuestion.remainingTime > 0,
    "host rejoin did not restore the live question and timer"
  );
  assert(
    hostRejoined.players.filter((player) => player.isHost).length === 1,
    "host rejoin duplicated or lost the host"
  );

  const gameOverPromise = event(rejoinedHost, "game_over");
  rejoinedHost.emit("stop_game", { roomId });
  const gameOver = await gameOverPromise;
  assert(
    gameOver.leaderboard.length === 2 && gameOver.winner?.isHost === false,
    "game over included or selected the host"
  );

  const rematchHost = event(rejoinedHost, "rematch_started");
  const rematchPlayerOne = event(playerOne, "rematch_started");
  const rematchPlayerTwo = event(playerTwo, "rematch_started");
  rejoinedHost.emit("rematch_game", { roomId });
  const [rematch] = await Promise.all([
    rematchHost,
    rematchPlayerOne,
    rematchPlayerTwo,
  ]);
  assert(
    rematch.players
      .filter((player) => !player.isHost)
      .every(
        (player) =>
          player.position === 0 &&
          player.ecoScore === 0 &&
          player.correctAnswers === 0
      ),
    "rematch did not reset player state"
  );
  assert(
    rematch.players.filter((player) => player.isHost).length === 1,
    "rematch host state is invalid"
  );

  console.log(
    JSON.stringify({
      ok: true,
      checks: [
        "host exclusion",
        "authoritative timer",
        "player rejoin",
        "host rejoin",
        "position-first ranking",
        "rematch reset",
      ],
    })
  );
  for (const socket of [rejoinedHost, playerOne, playerTwo]) socket.disconnect();
} catch (error) {
  console.error(error?.stack || error);
  for (const socket of [host, playerOne, playerTwo]) socket?.disconnect();
  process.exitCode = 1;
}