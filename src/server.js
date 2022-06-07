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

const onSocketConnection = (socket) => {
  console.log("test");
  console.log(socket);
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
