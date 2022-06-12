import http from "http";
import { WebSocketServer } from "ws";
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
      publicRooms.push(key);
    }
  });
  return publicRooms;
};
const onSocketConnection = (socket) => {
  socket["nickname"] = "Guest";
  socket.emit("room_change", getPublicRooms());
  socket.onAny((event) => {
    console.log(`Socket Event: ${event}`);
  });

  socket.on("enter_room", (roomName, done) => {
    socket.join(roomName);
    done(roomName);
    socket.to(roomName).emit("welcome", socket.nickname);
    wsServer.sockets.emit("room_change", getPublicRooms());
  });

  socket.on("disconnect", () => {
    wsServer.sockets.emit("room_change", getPublicRooms());
  });

  socket.on("disconnecting", () => {
    socket.rooms.forEach((room) =>
      socket.to(room).emit("bye", socket.nickname)
    );
  });
  socket.on("new_message", (msg, room, done) => {
    socket.to(room).emit("new_message", `${socket.nickname}: ${msg}`);
    done();
  });

  socket.on("nickname", (nickname) => (socket["nickname"] = nickname));
};

wsServer.on("connection", onSocketConnection);
/*
const wss = new WebSocketServer({ server: httpServer });

const sockets = [];
const onSocketClose = (socket) => {
  console.log("Disconnected from the Browser ❌");
  //sockets.splice(sockets.indexOf({ _closeCode: socket }), 1);
  //console.log("close", sockets.length);
};

const onSocketConnection = (socket) => {
  sockets.push(socket);
  nickname["nickname"] = "Anon";
  console.log("Connected to Browser ✅");
  console.log("connect", sockets);

  socket.on("close", onSocketClose);
  socket.on("message", (msg) => {
    const message = JSON.parse(msg);
    console.log(message);
    switch (message.type) {
      case "new_message":
        sockets.forEach((aSocket) =>
          aSocket.send(`${socket.nickname}: ${message.payload}`)
        );
        break;
      case "nickname":
        socket["nickname"] = message.payload;
        break;
    }
  });
};

wss.on("connection", onSocketConnection);*/
const handleListen = () =>
  console.log(`✅ Server listening on port http://localhost:${PORT} 🐾`);

httpServer.listen(PORT, handleListen);
