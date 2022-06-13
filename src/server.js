import http from "http";
import { Server } from "socket.io";
import express from "express";
import path from "path";

const PORT = 3000;
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
  socket["nickname"] = "Guest";
  socket.emit("room_change", getPublicRooms());
  socket.onAny((event) => {
    console.log(`Socket Event: ${event}`);
  });

  socket.on("enter_room", (roomName, done) => {
    socket.join(roomName);
    const userCount = getCountRoom(roomName);
    done(roomName, userCount);
    socket.to(roomName).emit("welcome", socket.nickname, userCount);
    wsServer.sockets.emit("room_change", getPublicRooms());
  });

  socket.on("disconnect", () => {
    wsServer.sockets.emit("room_change", getPublicRooms());
  });

  socket.on("disconnecting", () => {
    socket.rooms.forEach((room) =>
      socket.to(room).emit("bye", socket.nickname, getCountRoom(room) - 1)
    );
  });
  socket.on("new_message", (msg, room, done) => {
    socket.to(room).emit("new_message", `${socket.nickname}: ${msg}`);
    done();
  });

  socket.on("nickname", (nickname) => (socket["nickname"] = nickname));
};

wsServer.on("connection", onSocketConnection);
const handleListen = () =>
  console.log(`✅ Server listening on port http://localhost:${PORT} 🐾`);

httpServer.listen(PORT, handleListen);
