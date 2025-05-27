// function regularPollingInterval(cb) {
//   setInterval(() => {
//     fetch("http://localhost:3000/messages")
//       .then((res) => res.json())
//       .then((data) => cb(data));
//   }, 5000);
// }

function regularPolling(cb) {
  setTimeout(() => {
    fetch("http://localhost:3000/messages")
      .then((res) => res.json())
      .then((data) => cb(data))
      .then(() => polling(cb));
  }, 5000);
}

function longPolling(cb) {
  fetch("http://localhost:3000/notification")
    .then((res) => res.json())
    .then((event) => cb(event))
    .then(() => longPolling(cb));
}

//polling(function (data) {
//  const ul = document.createElement("ul");
//  data.forEach((message) => {
//    const li = document.createElement("li");
//    const textNode = document.createTextNode(
//      `${message.id} - ${message.content}`
//    );
//    li.appendChild(textNode);
//    ul.appendChild(li);
//  });
//  const root = document.getElementById("messages");
//  if (root.childNodes.length) {
//    root.replaceChild(ul, root.childNodes[0]);
//  } else {
//    root.appendChild(ul);
//  }
//});

longPolling(function (event) {
  const li = document.createElement("li");
  const textNode = document.createTextNode(
    `${event.payload.id} - ${event.payload.content}`
  );
  li.appendChild(textNode);
  document.querySelector("ul").appendChild(li);
});

document.getElementById("new-message").addEventListener("submit", (event) => {
  event.preventDefault();
  const formData = new FormData(event.currentTarget);

  fetch("http://localhost:3000/messages", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(Object.fromEntries(formData.entries())),
  });
});
