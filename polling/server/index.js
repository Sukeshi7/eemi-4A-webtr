const express = require("express");
const cors = require("cors");
const app = express();

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

app.get("/messages", (req, res) => {
  res.json(messages);
});
app.get("/notification", (req, res) => {
  addSubscriber(res);
});

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

function broadcast(event) {
  console.log(`${subscribers.length} subscribers to notifify`);
  for (let { id, res } of subscribers) {
    console.log(`Sending event to ${id}`);
    res.json(event);
  }
  clearSubscribers();
}

app.listen(3000, () => console.log("Server listening on port 3000"));
