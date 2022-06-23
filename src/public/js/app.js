const socket = io();

const myVideo = document.getElementById("myVideo");
const muteBtn = document.getElementById("mute");
const cameraBtn = document.getElementById("camera");
const camerasSelect = document.getElementById("cameras");
const mikesSelect = document.getElementById("mikes");
const backbtn = document.getElementById("backbtn");

const waitingroomSection = document.getElementById("entrance--section");
const chatroomSection = document.getElementById("chatroom--section");
chatroomSection.style.display = "none";
chatroomSection.style.opacity = 0;

let currStream;
let muted = false;
let cameraOff = false;
let roomName;
let nickName = "guest";
let myPeerConnection;
let myDataChannel;

let cameras = [];
let mikes = [];
let allRooms;

let selectedAudioID;
let selectedVideoID;

const getDevices = async () => {
  try {
    camerasSelect.innerHTML = "";
    mikesSelect.innerHTML = "";

    const devices = await navigator.mediaDevices.enumerateDevices();

    cameras = devices.filter((device) => device.kind === "videoinput");
    const currentCamera = currStream.getVideoTracks()[0];

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
    const currentMike = currStream.getAudioTracks()[0];

    mikes.forEach((mike) => {
      const option = document.createElement("option");
      option.value = mike.deviceId;
      option.innerText = mike.label;
      if (currentMike.label === mike.label) {
        option.selected = true;
      }
      mikesSelect.appendChild(option);
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
    currStream = await navigator.mediaDevices.getUserMedia(
      deviceId ? deviceConstrains : initialConstrains
    );
    myVideo.srcObject = currStream;

    currStream.getAudioTracks()[0].enabled = !muted;
    currStream.getVideoTracks()[0].enabled = !cameraOff;

    if (!deviceId) {
      await getDevices();
    }
  } catch (e) {
    console.log(e);
  }
};
const handleMuteClick = () => {
  currStream
    .getAudioTracks()
    .forEach((track) => (track.enabled = !track.enabled));
  if (!muted) {
    muteBtn.innerText = "마이크 사용";
    muted = true;
  } else {
    muteBtn.innerText = "마이크 미사용";
    muted = false;
  }
};

const handleCameraClick = () => {
  currStream
    .getVideoTracks()
    .forEach((track) => (track.enabled = !track.enabled));
  if (cameraOff) {
    cameraBtn.innerText = "카메라 미사용";
    cameraOff = false;
  } else {
    cameraBtn.innerText = "카메라 사용";
    cameraOff = true;
  }
};

const handleCameraChange = async () => {
  console.log(camerasSelect.value);
  await getMedia(camerasSelect.value);

  if (myPeerConnection) {
    updateStream();
  }
};

const handleMikeChange = async () => {
  console.log(mikesSelect.value);
  await getMedia(mikesSelect.value);

  if (myPeerConnection) {
    updateStream();
  }
};

const updateStream = () => {
  if (myPeerConnection) {
    const senders = myPeerConnection.getSenders();
    const audioTrack = currStream.getAudioTracks()[0];
    const videoTrack = currStream.getVideoTracks()[0];

    senders[0].replaceTrack(audioTrack);
    senders[1].replaceTrack(videoTrack);
  }
};
muteBtn.addEventListener("click", handleMuteClick);
cameraBtn.addEventListener("click", handleCameraClick);

camerasSelect.addEventListener("input", handleCameraChange);
mikesSelect.addEventListener("input", handleMikeChange);

const transSection = (toChatroom) => {
  if (toChatroom) {
    waitingroomSection.style.opacity = 0;

    setTimeout(() => {
      waitingroomSection.style.display = "none";
      chatroomSection.style.display = "flex";
      setTimeout(() => {
        chatroomSection.style.opacity = 1;
      }, 350);
    }, 500);
  } else {
    chatroomSection.style.opacity = 0;

    setTimeout(() => {
      waitingroomSection.style.display = "flex";
      chatroomSection.style.display = "none";
      setTimeout(() => {
        waitingroomSection.style.opacity = 1;
      }, 350);
    }, 500);
  }
};

// Welcome Form (join a room)

const welcome = document.getElementById("welcome");
const welcomeForm = welcome.querySelector("#join-form");

const initCall = async () => {
  transSection(true);
  await getMedia();
  makeConnection();
};

const handleWelcomeSubmit = async (event) => {
  event.preventDefault();

  const input = welcomeForm.querySelector("input");
  roomName = input.value;

  let canJoin = true;
  allRooms.forEach((room) => {
    if (room.key == roomName) {
      canJoin = room.userCount > 1 ? false : true;
    }
  });

  if (canJoin) {
    await initCall();
    socket.emit("join_room", roomName);
    input.value = "";
  }
};

const clickJoinRoom = async (event, roomValue) => {
  roomName = roomValue;
  await initCall();
  socket.emit("join_room", roomName);
};
welcomeForm.addEventListener("submit", handleWelcomeSubmit);

// Chatroom (go to waiting section)

const leaveRoom = () => {
  transSection(false);

  if (currStream) {
    currStream.getTracks().forEach((track) => track.stop());
    currStream = null;
  }

  socket.emit("leave_room", roomName);

  myDataChannel = null;
  roomName = "";
};

const chatLogs = document.getElementById("chatroom-log");

const addMessageChatRoom = (msg, isMine, isLog) => {
  const div = document.createElement("div");
  div.id = isLog ? "chat-log" : "chat";
  const message = document.createElement("bdi");
  if (!isLog) {
    div.className = isMine ? "mine" : "other";
  }
  message.innerText = msg;
  div.appendChild(message);

  chatLogs.appendChild(div);

  chatLogs.scrollTop = chatLogs.scrollHeight;
};

const chatForm = document.getElementById("chatting-form");
const chatInput = chatForm.querySelector("input");

chatForm.addEventListener("submit", (event) => {
  event.preventDefault();

  addMessageChatRoom(`${chatInput.value}`, true, false);
  const message = `${chatInput.value}`;
  if (myDataChannel) {
    myDataChannel.send(message);
  }

  chatInput.value = "";
});
backbtn.addEventListener("click", leaveRoom);

// Nickname Form (change nickname)
const nickname = document.querySelectorAll("#nickname");

nickname.forEach((element) => {
  const nicknameForm = element.querySelector("#nickname-form");
  nicknameForm.addEventListener("submit", (event) => {
    event.preventDefault();
    const input = nicknameForm.querySelector("input");
    nickName = input.value;

    addMessageChatRoom(`닉네임이 ${nickName}로 변경되셨습니다. `, false, true);
    socket.emit("change_nickname", nickName);
    input.value = "";
  });
});

const roomList = document.getElementById("room-list");
const paintRooms = (openRooms) => {
  roomList.innerHTML = "";
  allRooms = openRooms;
  openRooms.forEach((room) => {
    const roomDiv = document.createElement("div");
    roomDiv.className = "room";

    const roomInfo = document.createElement("div");
    roomInfo.className = "room--info";
    const roomHeader = document.createElement("h1");
    roomHeader.innerText = "방 제목";
    const roomTitle = document.createElement("span");
    roomTitle.innerText = room.key;
    roomInfo.appendChild(roomHeader);
    roomInfo.appendChild(roomTitle);

    const roomUserInfo = document.createElement("div");
    roomUserInfo.className = "room--userinfo";
    const userHeader = document.createElement("h1");
    userHeader.innerText = "참여 인원";
    const roomUserCount = document.createElement("span");
    roomUserCount.innerText = `${room.userCount} / 2`;
    roomUserInfo.appendChild(userHeader);
    roomUserInfo.appendChild(roomUserCount);

    roomDiv.appendChild(roomInfo);
    roomDiv.appendChild(roomUserInfo);
    roomDiv.value = room.key;

    roomDiv.addEventListener("click", () => {
      if (room.userCount < 2) {
        clickJoinRoom(event, roomDiv.value);
      }
    });
    roomList.appendChild(roomDiv);
  });
};
// Socket Code

socket.on("room_change", (openRooms) => {
  paintRooms(openRooms);
});
socket.on("welcome", async (nickname) => {
  addMessageChatRoom(`${nickname} 님이 입장하셨습니다`, false, true);

  myDataChannel = myPeerConnection.createDataChannel("chat");
  myDataChannel.addEventListener("message", (event) => {
    addMessageChatRoom(event.data, false, false);
  });
  console.log("made data channel");

  const offer = await myPeerConnection.createOffer();
  myPeerConnection.setLocalDescription(offer);

  console.log("sent the offer");
  socket.emit("offer", offer, roomName);
});

socket.on("offer", async (offer) => {
  myPeerConnection.addEventListener("datachannel", (event) => {
    myDataChannel = event.channel;
    myDataChannel.addEventListener("message", (event) => {
      addMessageChatRoom(event.data, false, false);
    });
  });

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

socket.on("leave-room", async (nickname) => {
  addMessageChatRoom(`${nickname} 님이 퇴장하셨습니다`, false, true);
  myPeerConnection.close();
  myDataChannel = null;
  await makeConnection();
});

// RTC Code

const makeConnection = () => {
  myPeerConnection = new RTCPeerConnection({
    iceServers: [
      {
        urls: [
          "stun:stun.l.google.com:19302",
          "stun:stun1.l.google.com:19302",
          "stun:stun2.l.google.com:19302",
          "stun:stun3.l.google.com:19302",
          "stun:stun4.l.google.com:19302",
        ],
      },
    ],
  });
  myPeerConnection.addEventListener("icecandidate", handleIce);
  myPeerConnection.addEventListener("addstream", handleAddStream);

  currStream
    .getTracks()
    .forEach((track) => myPeerConnection.addTrack(track, currStream));
};

const handleIce = (data) => {
  console.log("sent candidate");
  socket.emit("ice", data.candidate, roomName);
};

const handleAddStream = (data) => {
  const peerFace = document.getElementById("otherVideo");
  peerFace.srcObject = data.stream;
};
