let username;

document.getElementById("login").addEventListener("submit", function (event) {
  event.preventDefault();
  const data = new FormData(event.currentTarget);
  username = data.get("username");
  document
    .getElementById("username")
    .appendChild(document.createTextNode(username));

  const websocket = new WebSocket("ws://localhost:3000");
  websocket.addEventListener("open", function () {
    console.log("WebSocket connection established");
    websocket.send(
      JSON.stringify({ type: "authenticate", payload: { username } })
    );
  });

  websocket.addEventListener("message", function (message) {
    const data = JSON.parse(message.data);
    switch (data.type) {
      case "authenticated":
        document.getElementById("chat").style.display = "block";
        event.currentTarget.style.display = "none";
        break;
      case "new-subscriber":
        addMessage({
          username: "System",
          message: `#${data.payload.id} has joined the chat.`,
        });
        break;
      case "new-message":
        addMessage(data.payload);
        break;
    }
  });

  document.getElementById("send").addEventListener("submit", function (e) {
    e.preventDefault();
    const data = new FormData(e.currentTarget);
    const message = data.get("message");
    websocket.send(
      JSON.stringify({
        type: "new-message",
        payload: {
          username,
          message,
        },
      })
    );
    e.currentTarget.reset();
  });
});

function addMessage(message) {
  const messageItem = document.createElement("div");

  messageItem.style.alignSelf =
    message.username === username ? "self-end" : "self-start";
  messageItem.style.backgroundColor =
    message.username === username ? "blue" : "white-smoke";
  messageItem.style.color = message.username === username ? "white" : "black";

  messageItem.appendChild(
    document.createTextNode(
      `${message.message}` +
        (message.username !== username ? ` - ${message.username}` : "")
    )
  );
  document.getElementById("messages").appendChild(messageItem);
}
