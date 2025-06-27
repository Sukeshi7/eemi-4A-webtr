let username;
let chess = null;
let board = null;
let gameEnded = false;

document.getElementById("login").addEventListener("submit", async function (e) {
  e.preventDefault();
  const data = new FormData(e.currentTarget);
  username = data.get("username");

  const eventSource = new EventSource("http://localhost:3000/subscribe");

  eventSource.addEventListener("player-joined", function (e) {
    const playerData = JSON.parse(e.data);
    document
      .getElementById(playerData.color)
      .appendChild(document.createTextNode(`${playerData.username}`));
  });

  eventSource.addEventListener("game-started", function (e) {
    chess = new Chess();

    function onDragStart(source, piece, position, orientation) {
      // do not pick up pieces if the game is over
      if (gameEnded) return false;

      // only pick up pieces for the side to move
      if (
        (chess.turn() === "w" && piece.search(/^b/) !== -1) ||
        (chess.turn() === "b" && piece.search(/^w/) !== -1)
      ) {
        return false;
      }
    }

    async function onDrop(source, target) {
      // see if the move is legal
      var move = chess.move({
        from: source,
        to: target,
        promotion: "q", // NOTE: always promote to a queen for example simplicity
      });

      // illegal move
      if (move === null) return "snapback";

      const resp = await fetch("http://localhost:3000/chess/move", {
        headers: {
          "content-type": "application/json",
        },
        body: JSON.stringify({
          username,
          move: target,
        }),
        method: "POST",
      });

      if (!resp.ok) {
        alert("Failed to move piece");
      } else {
        // if the move was successful, update the board position
        board.position(chess.fen());
      }
    }

    board = ChessBoard("board", {
      draggable: true,
      position: "start",
      onDragStart: onDragStart,
      onDrop: onDrop,
    });
  });
  eventSource.addEventListener("move-made", function (e) {
    const { username, color, move } = JSON.parse(e.data);
    chess.move(move);
    board.position(chess.fen());
    console.log(`Move made by ${username} (${color}): ${move}`);
  });
  eventSource.addEventListener("game-won", function (e) {
    gameEnded = true;
    board.destroy();
    alert("Game Over! " + e.data + " wins!");
  });
  eventSource.addEventListener("game-draw", function (e) {
    gameEnded = true;
    board.destroy();
    alert("Game Over! It's a draw!");
  });

  eventSource.addEventListener("open", async function () {
    console.log("Connection to server opened.");

    const resp = await fetch("http://localhost:3000/chess", {
      headers: {
        "content-type": "application/json",
      },
      method: "POST",
      body: JSON.stringify({
        username,
      }),
    });

    if (!resp.ok) {
      alert("Failed to login");
    } else {
      document.getElementById("chessboard").style.display = "block";
      e.target.style.display = "none";
    }
  });
});
