let username;

document.getElementById("login").addEventListener("submit", function (e) {
  e.preventDefault();
  const data = new FormData(e.currentTarget);
  username = data.get("username");
  document
    .getElementById("username")
    .appendChild(document.createTextNode(username));
  const eventSource = new EventSource(
    "http://localhost:3000/messages/subscribe"
  );
  eventSource.addEventListener("message", function (e) {
    const data = JSON.parse(e.data);
    switch (data.type) {
      case "new-message":
        break;
    }
  });
  eventSource.addEventListener("new-message", function (e) {
    addMessage(JSON.parse(e.data));
  });
  document.getElementById("chat").style.display = "block";
  e.currentTarget.style.display = "none";
});

document.getElementById("send").addEventListener("submit", function (e) {
  e.preventDefault();
  const data = new FormData(e.currentTarget);
  const message = data.get("message");
  fetch("http://localhost:3000/messages", {
    headers: {
      "content-type": "application/json",
    },
    method: "POST",
    body: JSON.stringify({
      username,
      message,
    }),
  })
    .then((resp) => {
      if (resp.ok) alert("Message sent");
      else alert("Failed to send message");
    })
    .catch(() => alert("Failed to send message"));
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
