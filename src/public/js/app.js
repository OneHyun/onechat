const socket = io();

const welcome = document.getElementById("welcome");
const welcomeForm = welcome.querySelector("form");
const room = document.getElementById("room");

room.hidden = true;
let roomName;

const addMessage = (message) => {
  const ul = room.querySelector("ul");
  const li = document.createElement("li");
  li.innerText = message;
  ul.appendChild(li);
};

const handleMessageSubmit = (event) => {
  event.preventDefault();
  const input = room.querySelector("#msg input");
  const value = input.value;
  socket.emit("new_message", value, roomName, () => {
    addMessage(`You: ${value}`);
  });
  input.value = "";
};

const handleNicknameSubmit = (event) => {
  event.preventDefault();
  const input = room.querySelector("#name input");
  const value = input.value;
  socket.emit("nickname", value);
  input.value = "";
};

const showRoom = (roomTitle) => {
  welcome.hidden = true;
  room.hidden = false;
  const roomTitleHeader = document.getElementById("room__title");
  roomTitleHeader.innerText = `Room ${roomTitle}`;

  const msgForm = room.querySelector("#msg");
  msgForm.addEventListener("submit", handleMessageSubmit);
};

const handleRoomSubmit = (event) => {
  event.preventDefault();
  const roomNameInput = welcomeForm.querySelector("#roomName");
  roomName = roomNameInput.value;
  const nickNameInput = welcomeForm.querySelector("#nickName");
  const nickName = nickNameInput.value;
  socket.emit("nickname", nickName);
  socket.emit("enter_room", roomName, showRoom);
  roomNameInput.value = "";
  nickNameInput.value = "";
};
welcomeForm.addEventListener("submit", handleRoomSubmit);

socket.on("welcome", (user) => {
  addMessage(`${user} join`);
});

socket.on("bye", (user) => {
  addMessage(`${user} left`);
});

socket.on("new_message", addMessage);

const updateRoomList = (rooms) => {
  const roomList = welcome.querySelector("ul");
  roomList.innerHTML = "";
  if (rooms.length === 0) {
    return;
  }
  rooms.forEach((room) => {
    const li = document.createElement("li");
    li.innerText = room;
    roomList.appendChild(li);
  });
};
socket.on("room_change", updateRoomList);
