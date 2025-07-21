const iceServers = undefined;

const senderRPC = new RTCPeerConnection({ iceServers });
const receiverRPC = new RTCPeerConnection({ iceServers });
const senderDataChannel = senderRPC.createDataChannel("messages");

senderRPC.addEventListener("negotiationneeded", async function () {
  const offer = await senderRPC.createOffer({
    offerToReceiveVideo: true,
  });
  await senderRPC.setLocalDescription(offer);
  // Send offer by signal server to receiver
  await receiverRPC.setRemoteDescription(offer);

  const answer = await receiverRPC.createAnswer();
  await receiverRPC.setLocalDescription(answer);
  // Send answer by signal server to sender
  await senderRPC.setRemoteDescription(answer);
});

senderRPC.addEventListener("icecandidate", function (event) {
  // Send iceCandidate by signal server to receiver
  if (event.candidate) receiverRPC.addIceCandidate(event.candidate);
});

receiverRPC.addEventListener("icecandidate", function (event) {
  // Send iceCandidate by signal server to sender
  if (event.candidate) senderRPC.addIceCandidate(event.candidate);
});

senderRPC.addEventListener("connectionstatechange", function (event) {
  console.log("senderRPC", event);
});
receiverRPC.addEventListener("connectionstatechange", function (event) {
  console.log("receveirRPC", event);
});

document.querySelector("#original").addEventListener("play", function (event) {
  console.log(event.currentTarget);
  const videoElement = event.currentTarget;
  const stream = videoElement.captureStream();

  for (let track of stream.getTracks()) {
    senderRPC.addTrack(track, stream);
  }
});

receiverRPC.addEventListener("track", function (event) {
  const videoElement = document.querySelector("#duplicate");
  videoElement.srcObject = event.streams[0];
  videoElement.play();
});

receiverRPC.addEventListener("datachannel", function (event) {
  const receiverDataChannel = event.channel;
  console.log(event);
  receiverDataChannel.addEventListener("message", function (event) {
    console.log("receiverDataChannel", event);
    addMessage({
      from: "sender",
      message: event.data,
    });
  });

  document
    .querySelector("#send-receiver")
    .addEventListener("submit", function (event) {
      event.preventDefault();
      const formData = new FormData(event.currentTarget);
      const message = formData.get("message");
      receiverDataChannel.send(message);
    });
});

senderDataChannel.addEventListener("message", function (event) {
  console.log("senderDataChannel", event);
  addMessage({
    from: "receiver",
    message: event.data,
  });
});

document
  .querySelector("#send-sender")
  .addEventListener("submit", function (event) {
    event.preventDefault();
    const formData = new FormData(event.currentTarget);
    const message = formData.get("message");
    senderDataChannel.send(message);
  });

function addMessage(message) {
  const messageItem = document.createElement("div");

  messageItem.style.alignSelf =
    message.from === "sender" ? "self-end" : "self-start";
  messageItem.style.backgroundColor =
    message.from === "sender" ? "blue" : "white-smoke";
  messageItem.style.color = message.from === "sender" ? "white" : "black";

  messageItem.appendChild(
    document.createTextNode(
      `${message.message}` +
        (message.from !== "sender" ? ` - ${message.from}` : "")
    )
  );
  document.getElementById("messages").appendChild(messageItem);
}
