import "dotenv/config";
import express from "express";
import cors from "cors";
import morgan from "morgan";
import http from "http";
import { dbConnet } from "./config/mongoose";
import { Server, Socket } from "socket.io";

// Definir el tipo ConnectedUser
type ConnectedUser = {
  id: string;
  email: string;
};

// Creamos la aplicación Express
const app = express();
app.use(cors());
app.use(morgan("dev"));
app.use(express.json());

// Rutas
import userRoutes from "./routes/user.routes";
import diagramRoutes from "./routes/diagram.routes";
import authRoutes from "./routes/auth.routes";

app.use("/api/users", userRoutes);
app.use("/api/diagrams", diagramRoutes);
app.use("/api/auth", authRoutes);

app.get("/", (req, res) => {
  res.send("Hello world");
});

// Crear servidor HTTP
const server = http.createServer(app);

// Crear instancia de Socket.io
export const io = new Server(server, {
  cors: {
    origin: "*", // Permitir todas las conexiones de orígenes
  },
});

// Almacena los usuarios conectados por sala
const rooms: Record<string, ConnectedUser[]> = {};

// Manejar conexión de Socket.io
io.on("connection", (socket: Socket) => {
  console.log("A user connected");

  socket.on("joinRoom", ({ diagramId, user }: { diagramId: string; user: string }) => {
    socket.join(diagramId);

    if (!rooms[diagramId]) {
      rooms[diagramId] = [];
    }

    rooms[diagramId].push({ id: socket.id, email: user });
    io.to(diagramId).emit("usersConnectedUpdate", rooms[diagramId]); 

    console.log(`${user} joined room: ${diagramId}`);
  });

  socket.on("updateDiagram", ({ diagramId, diagramContent }: { diagramId: string; diagramContent: string }) => {
    io.to(diagramId).emit("diagramUpdated", diagramContent);
  });

  socket.on("disconnect", () => {
    console.log("User disconnected");

    for (const diagramId in rooms) {
      rooms[diagramId] = rooms[diagramId].filter((user) => user.id !== socket.id);

      io.to(diagramId).emit("usersConnectedUpdate", rooms[diagramId]);
    }
  });
});

const PORT = process.env.PORT || 3000;

async function startServer() {
  try {
    await dbConnet();
    console.log("Database connected");

    server.listen(PORT, () => console.log(`Server listening on port ${PORT}`));
  } catch (error) {
    console.error("Error connecting to database", error);
  }
}

startServer();
