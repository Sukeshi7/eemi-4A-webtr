const { createServer } = require("http");
const { WebSocketServer } = require("ws");

const server = createServer();

const wss = new WebSocketServer({ server });

wss.on("connection", (connection) => {
  console.log("New WebSocket connection established");
  addSubscriber(connection);
});

let subscribers = [];

function addSubscriber(connection) {
  const subscriber = {
    id: Date.now(),
    connection,
  };
  console.log(`Adding subscriber ${subscriber.id}`);
  subscribers.push(subscriber);
  connection.addEventListener("close", () => removeSubscriber(subscriber.id));
  connection.addEventListener("error", () => removeSubscriber(subscriber.id));
  broadcast({
    type: "new-subscriber",
    payload: { id: subscriber.id },
  });
  connection.addEventListener("message", (event) => {
    console.log(
      `Received message from subscriber ${subscriber.id}: ${event.data}`
    );
    const message = JSON.parse(event.data);
    switch (message.type) {
      case "authenticate":
        console.log(`Subscriber ${subscriber.id} authenticated`);
        connection.send(
          JSON.stringify({
            type: "authenticated",
            payload: { id: subscriber.id },
          })
        );
        break;
      case "new-message":
        console.log(
          `New message from ${subscriber.id}: ${message.payload.message}`
        );
        broadcast({
          type: "new-message",
          payload: {
            username: message.payload.username,
            message: message.payload.message,
          },
        });
        break;
      default:
        console.warn(
          `Unknown message type from subscriber ${subscriber.id}: ${message.type}`
        );
    }
    // Here you can handle incoming messages from subscribers if needed
  });
}

function removeSubscriber(id) {
  console.log(`Removing subscriber ${id}`);
  const index = subscribers.findIndex((s) => s.id == id);
  if (index !== -1) subscribers.splice(index, 1);
}

function clearSubscribers() {
  subscribers.splice(0, Infinity);
}

function broadcast(event) {
  console.log(`${subscribers.length} subscribers to notify`);
  for (let { id: subId, connection } of subscribers) {
    connection.send(JSON.stringify(event));
  }
}

server.listen(3000, () => console.log("Server listening on port 3000"));
