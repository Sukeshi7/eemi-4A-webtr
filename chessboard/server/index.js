const express = require("express");
const cors = require("cors");
const app = express();
const { Chess } = require("chess.js");

app.use(express.json());
app.use(cors());

const messages = [];
let subscribers = [];

function addSubscriber(res) {
  const subscriber = {
    id: Date.now(),
    res,
  };
  console.log(`Adding subscriber ${subscriber.id}`);
  subscribers.push(subscriber);
  res.on("close", () => removeSubscriber(subscriber.id));
  res.on("error", () => removeSubscriber(subscriber.id));
}

function removeSubscriber(id) {
  console.log(`Removing subscriber ${id}`);
  const index = subscribers.findIndex((s) => s.id == id);
  if (index !== -1) subscribers.splice(index, 1);
}

function clearSubscribers() {
  subscribers.splice(0, Infinity);
}

app.post("/messages", (req, res) => {
  const message = {
    id: Date.now(),
    ...req.body,
  };
  messages.push(message);
  broadcast({
    type: "new-message",
    payload: message,
  });
  res.sendStatus(201);
});

const players = {
  white: null,
  black: null,
};
let chess = new Chess();
app.post("/chess", (req, res) => {
  if (players.white && players.black) return res.sendStatus(409);
  const playerColor = players.white ? "black" : "white";
  players[playerColor] = req.body.username;
  broadcast({
    type: "player-joined",
    payload: {
      color: playerColor,
      username: req.body.username,
    },
  });
  if (players.white && players.black) {
    chess = new Chess(); // Reset the chess game
    broadcast({
      type: "game-started",
      payload: {
        white: players.white,
        black: players.black,
      },
    });
  }
  res.sendStatus(201);
});

app.post("/chess/move", (req, res) => {
  if (!players.white || !players.black) return res.sendStatus(403);
  const { username, move } = req.body;
  if (username !== players.white && username !== players.black) {
    return res.sendStatus(403);
  }
  if (!chess) {
    return res.status(400).json({ error: "Game not started yet." });
  }
  if (!chess.move(move)) {
    return res.status(400).json({ error: "Invalid move." });
  }
  broadcast({
    type: "move-made",
    payload: {
      username,
      color: username === players.white ? "white" : "black",
      move,
    },
  });
  res.sendStatus(201);
  checkmate();
});

app.get("/subscribe", (req, res) => {
  addSubscriber(res);
  res.writeHead(200, {
    connection: "keep-alive",
    "content-type": "text/event-stream",
    "cache-control": "no-cache",
  });

  res.write(": ping\n\n");
  setInterval(function () {
    res.write(": ping\n\n");
  }, 10 * 1000);
});

function broadcast(event) {
  console.log(`${subscribers.length} subscribers to notify`);
  for (let { id: subId, res } of subscribers) {
    console.log(`Sending event to ${subId}`);
    const { type, payload } = event;
    res.write(`id: ${payload.id}\n`);
    res.write(`event: ${type}\n`);
    res.write(`data: ${JSON.stringify(payload)}`);
    res.write(`\n\n`);
  }
}

app.listen(3000, () => console.log("Server listening on port 3000"));

function checkmate() {
  if (chess.isGameOver()) {
    const winner = chess.turn() === "w" ? players.black : players.white;
    broadcast({
      type: "game-won",
      payload: {
        username: winner,
      },
    });
    // Reset the game
    players.white = null;
    players.black = null;
    chess = new Chess();
  } else if (chess.isDraw()) {
    broadcast({
      type: "game-draw",
    });
    // Reset the game
    chess = new Chess();
  }
}
