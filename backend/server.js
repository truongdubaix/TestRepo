import express from "express";
import cors from "cors";
import cookieParser from "cookie-parser";
import dotenv from "dotenv";
import pool from "./config/db.js";
import { fileURLToPath } from "url";
import path from "path";
import { createServer } from "http";
import { Server } from "socket.io";
import initSocket from "./socket/initSocket.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

import authRoutes from "./routes/authRoutes.js";
import passRoutes from "./routes/passRoutes.js";
import driverRoutes from "./routes/driverRoutes.js";
import shipmentRoutes from "./routes/shipmentRoutes.js";
import userRoutes from "./routes/userRoutes.js";
import paymentRoutes from "./routes/paymentRoutes.js";
import adminRoutes from "./routes/adminRoutes.js";
import dispatcherRoutes from "./routes/dispatcherRoutes.js";
import driverAdminRoutes from "./routes/driverAdminRoutes.js";
import driverLocationRoutes from "./routes/driverLocationRoutes.js";
import roleRoutes from "./routes/roleRoutes.js";
import vehicleRoutes from "./routes/vehicleRoutes.js";
import customerRoutes from "./routes/customerRoutes.js";
import feedbackRoutes from "./routes/feedbackRoutes.js";
import notificationRoutes from "./routes/notificationRoutes.js";
import contactRoutes from "./routes/contactRoutes.js";
import aiRoutes from "./routes/aiRoutes.js";
import addressRoutes from "./routes/addressRoutes.js";
import walletRoutes from "./routes/walletRoutes.js";
import shippingRoutes from "./routes/shippingRoutes.js";
import newsRoutes from "./routes/newsRoutes.js";
import driverApplicationRoutes from "./routes/driverApplicationRoutes.js";

dotenv.config();
const app = express();

app.use(
  cors({
    origin: [
      "http://localhost:5173",
      "http://localhost:5174",
      "http://127.0.0.1:5173",
      "http://127.0.0.1:5174",
    ],
    credentials: true,
  }),
);

app.use(express.json({ limit: "50mb" }));
app.use(express.urlencoded({ limit: "50mb", extended: true }));
app.use(cookieParser({ limit: "50mb", extended: true }));
app.use("/uploads", express.static(path.join(__dirname, "uploads")));

pool
  .query("SELECT 1")
  .then(() => console.log("MySQL đã kết nối CSDL thành công!"))
  .catch(console.error);

const server = createServer(app);
const io = new Server(server, {
  cors: {
    origin: [
      "http://localhost:5173",
      "http://localhost:5174",
      "http://127.0.0.1:5173",
      "http://127.0.0.1:5174",
    ],
    methods: ["GET", "POST"],
    credentials: true,
  },
});

const socketService = initSocket(io, pool);

export const {
  sendNotificationToDriver,
  sendNotificationToDispatcher,
  sendNotificationToCustomer,
} = socketService;

app.use("/api/auth", authRoutes);
app.use("/api/auth", passRoutes);
app.use("/api/drivers", driverRoutes);
app.use("/api/drivers", driverApplicationRoutes);
app.use("/api/drivers", driverAdminRoutes);
app.use("/api/drivers", driverLocationRoutes);
app.use("/api/shipments", shipmentRoutes);
app.use("/api/users", userRoutes);
app.use("/api/payments", paymentRoutes);
app.use("/api/admin", adminRoutes);
app.use("/api/dispatcher", dispatcherRoutes);
app.use("/api/roles", roleRoutes);
app.use("/api/vehicles", vehicleRoutes);
app.use("/api/customers", customerRoutes);
app.use("/api/feedbacks", feedbackRoutes);
app.use("/api/notifications", notificationRoutes);
app.use("/api/contact", contactRoutes);
app.use("/api/ai", aiRoutes);
app.use("/api/addresses", addressRoutes);
app.use("/api/wallet", walletRoutes);
app.use("/api/shipping", shippingRoutes);
app.use("/api/news", newsRoutes);

app.get("/", (_req, res) =>
  res.send(" SpeedyShip API running with realtime chat & notifications"),
);

const PORT = process.env.PORT || 5000;
server.listen(PORT, () => {
  console.log(` Server đang chạy tại http://localhost:${PORT}`);
});
