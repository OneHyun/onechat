const socket = io();

const myVideo = document.getElementById("myVideo");
const muteBtn = document.getElementById("mute");
const cameraBtn = document.getElementById("camera");
const camerasSelect = document.getElementById("cameras");
const mikeSelect = document.getElementById("mikes");

const call = document.getElementById("call");
call.hidden = true;

let myStream;
let muted = false;
let cameraOff = false;
let roomName;
let myPeerConnection;

let cameras = [];
let mikes = [];

let selectedAudioID;
let selectedVideoID;

const getDevices = async () => {
  try {
    const devices = await navigator.mediaDevices.enumerateDevices();

    cameras = devices.filter((device) => device.kind === "videoinput");
    const currentCamera = myStream.getVideoTracks()[0];

    cameras.forEach((camera) => {
      const option = document.createElement("option");
      option.value = camera.deviceId;
      option.innerText = camera.label;
      if (currentCamera.label === camera.label) {
        option.selected = true;
      }
      camerasSelect.appendChild(option);
    });

    mikes = devices.filter((device) => device.kind === "audioinput");
    const currentMike = myStream.getAudioTracks()[0];

    mikes.forEach((mike) => {
      const option = document.createElement("option");
      option.value = mike.deviceId;
      option.innerText = mike.label;
      if (currentMike.label === mike.label) {
        option.selected = true;
      }
      mikeSelect.appendChild(option);
    });

    if (cameras.length <= 1) {
      camerasSelect.disabled = true;
    }
    if (mikes.length <= 1) {
      mikesSelect.disabled = true;
    }
  } catch (e) {
    console.log(e);
  }
};

const getMedia = async (deviceId) => {
  const initialConstrains = {
    audio: true,
    video: {
      facingMode: "user",
    },
  };

  const deviceInMike =
    mikes.filter((e) => e.deviceId === deviceId).length >= 1 ? true : false;
  const deviceInVideo =
    cameras.filter((e) => e.deviceId === deviceId).length >= 1 ? true : false;

  if (deviceInMike) {
    selectedAudioID = deviceId;
  } else if (deviceInVideo) {
    selectedVideoID = deviceId;
  }

  const deviceConstrains = {
    audio: deviceInMike
      ? { deviceId: { exact: deviceId } }
      : selectedAudioID !== undefined
      ? { deviceId: { exact: selectedAudioID } }
      : true,
    video: deviceInVideo
      ? {
          deviceId: { exact: deviceId },
        }
      : selectedVideoID !== undefined
      ? { deviceId: { exact: selectedVideoID } }
      : { facingMode: "user" },
  };

  try {
    myStream = await navigator.mediaDevices.getUserMedia(
      deviceId ? deviceConstrains : initialConstrains
    );
    myVideo.srcObject = myStream;

    myStream.getAudioTracks()[0].enabled = !muted;
    myStream.getVideoTracks()[0].enabled = !cameraOff;

    if (!deviceId) {
      await getDevices();
    }
  } catch (e) {
    console.log(e);
  }
};
const handleMuteClick = () => {
  myStream
    .getAudioTracks()
    .forEach((track) => (track.enabled = !track.enabled));
  if (!muted) {
    muteBtn.innerText = "Unmute";
    muted = true;
  } else {
    muteBtn.innerText = "Mute";
    muted = false;
  }
};

const handleCameraClick = () => {
  myStream
    .getVideoTracks()
    .forEach((track) => (track.enabled = !track.enabled));
  if (cameraOff) {
    cameraBtn.innerText = "Turn Camera Off";
    cameraOff = false;
  } else {
    cameraBtn.innerText = "Turn Camera On";
    cameraOff = true;
  }
};

const handleCameraChange = async () => {
  console.log(camerasSelect.value);
  await getMedia(camerasSelect.value);
};

const handleMikeChange = async () => {
  console.log(mikeSelect.value);
  await getMedia(mikeSelect.value);
};

muteBtn.addEventListener("click", handleMuteClick);
cameraBtn.addEventListener("click", handleCameraClick);

camerasSelect.addEventListener("input", handleCameraChange);
mikeSelect.addEventListener("input", handleMikeChange);

// Welcome Form (join a room)

const welcome = document.getElementById("welcome");
const welcomeForm = welcome.querySelector("form");

const initCall = async () => {
  welcome.hidden = true;
  call.hidden = false;
  await getMedia();
  makeConnection();
};

const handleWelcomeSubmit = async (event) => {
  event.preventDefault();
  const input = welcomeForm.querySelector("input");
  roomName = input.value;
  await initCall();
  socket.emit("join_room", roomName);
  input.value = "";
};

welcomeForm.addEventListener("submit", handleWelcomeSubmit);

// Socket Code

socket.on("welcome", async () => {
  const offer = await myPeerConnection.createOffer();
  myPeerConnection.setLocalDescription(offer);

  console.log("sent the offer");
  socket.emit("offer", offer, roomName);
});

socket.on("offer", async (offer) => {
  console.log("received the offer");
  myPeerConnection.setRemoteDescription(offer);

  const answer = await myPeerConnection.createAnswer();
  myPeerConnection.setLocalDescription(answer);

  console.log("sent the answer");
  socket.emit("answer", answer, roomName);
});

socket.on("answer", (answer) => {
  console.log("received the answer");
  myPeerConnection.setRemoteDescription(answer);
});

socket.on("ice", (ice) => {
  console.log("received candidate");
  myPeerConnection.addIceCandidate(ice);
});

// RTC Code

const makeConnection = () => {
  myPeerConnection = new RTCPeerConnection();
  myPeerConnection.addEventListener("icecandidate", handleIce);
  myPeerConnection.addEventListener("track", handleAddStream);

  myStream
    .getTracks()
    .forEach((track) => myPeerConnection.addTrack(track, myStream));
};

const handleIce = (data) => {
  console.log("sent candidate");
  socket.emit("ice", data.candidate, roomName);
};

const handleAddStream = (data) => {
  console.log("got an stream from my peer");
  console.log("Peer's Stream", data.streams[0]);
  console.log("My Stream", myStream);

  const peerFace = document.getElementById("peerFace");
  peerFace.srcObject = data.streams[0];
};
