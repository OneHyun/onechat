import http from "http";
import { Server } from "socket.io";
import express from "express";
import path from "path";

const PORT = process.env.PORT || 3000;
const __dirname = path.resolve();
const app = express();

app.set("view engine", "pug");
app.set("views", __dirname + "/src/views");
app.use("/public", express.static(__dirname + "/src/public"));
app.get("/", (_, res) => res.render("home"));
app.get("/*", (_, res) => res.redirect("/"));

const httpServer = http.createServer(app);
const wsServer = new Server(httpServer);

const getPublicRooms = () => {
  const { rooms, sids } = wsServer.sockets.adapter;

  let publicRooms = [];
  rooms.forEach((value, key) => {
    if (!sids.get(key)) {
      const userCount = getCountRoom(key);
      publicRooms.push({ key, userCount });
    }
  });
  return publicRooms;
};

const getCountRoom = (roomName) => {
  return wsServer.sockets.adapter.rooms.get(roomName)?.size;
};

const onSocketConnection = (socket) => {
  console.log("connetced");
  socket["nickname"] = "guest";

  socket.emit("room_change", getPublicRooms());

  socket.on("join_room", (roomName) => {
    socket.join(roomName);
    socket.to(roomName).emit("welcome", socket.nickname);
    wsServer.sockets.emit("room_change", getPublicRooms());
  });

  socket.on("leave_room", (roomName) => {
    socket.to(roomName).emit("leave-room", socket.nickname);
    socket.leave(roomName);
    wsServer.sockets.emit("room_change", getPublicRooms());
  });

  socket.on("change_nickname", (nickname) => {
    console.log(socket.nickname);
    socket["nickname"] = nickname;
    console.log(socket.nickname);
  });
  socket.on("offer", (offer, roomName) => {
    socket.to(roomName).emit("offer", offer);
  });

  socket.on("answer", (answer, roomName) => {
    socket.to(roomName).emit("answer", answer);
  });

  socket.on("ice", (ice, roomName) => {
    socket.to(roomName).emit("ice", ice);
  });

  socket.on("disconnect", () => {
    wsServer.sockets.emit("room_change", getPublicRooms());
  });

  socket.on("disconnecting", () => {
    socket.rooms.forEach((room) =>
      socket.to(room).emit("leave-room", socket.nickname)
    );
  });
};

wsServer.on("connection", onSocketConnection);
const handleListen = () =>
  console.log(`✅ Server listening on port http://localhost:${PORT} 🐾`);

httpServer.listen(PORT, handleListen);
