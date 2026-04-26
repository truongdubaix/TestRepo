
const SYSTEM_ID = 0;
const WELCOME_CONTENT =
  "Xin chào 👋! Chúng tôi là đội ngũ hỗ trợ SpeedyShip. Bạn cần giúp gì hôm nay?";


let onlineDrivers = {};
let activeChats = {};

export default function initSocket(io, pool) {
  io.on("connection", (socket) => {



    socket.on("joinDispatcher", () => {
      socket.join("dispatcherRoom");
    });


    socket.on("joinCustomer", (customerId) => {
      socket.join(`customer_${customerId}`);
    });


    socket.on("registerDriver", async (userId) => {

      onlineDrivers[`user_${userId}`] = socket.id;


      try {
        const [drivers] = await pool.query(
          "SELECT id FROM drivers WHERE user_id = ?",
          [userId]
        );
        if (drivers.length > 0) {
          drivers.forEach(d => {
            onlineDrivers[d.id] = socket.id;
          });
        } else {

          onlineDrivers[userId] = socket.id;
        }
      } catch (err) {
        onlineDrivers[userId] = socket.id;
      }
    });


    socket.on("startChat", async (customerId) => {
      try {

        let chatId;
        const [existingChats] = await pool.query(
          "SELECT id FROM chats WHERE customer_id = ? AND status = 'active' LIMIT 1",
          [customerId]
        );

        if (existingChats.length > 0) {
          chatId = existingChats[0].id;
        } else {
          const [result] = await pool.query(
            "INSERT INTO chats (customer_id, status) VALUES (?, 'active')",
            [customerId]
          );
          chatId = result.insertId;
        }


        activeChats[customerId] = chatId;
        const room = `chat_${chatId}`;
        socket.join(room);


        io.to(socket.id).emit("chatStarted", chatId);


        io.to("dispatcherRoom").emit("newChat", { chatId, customerId });


        setTimeout(async () => {

          const [msgCheck] = await pool.query(
            "SELECT id FROM messages WHERE chat_id = ? LIMIT 1",
            [chatId]
          );

          if (msgCheck.length === 0) {
            const time = new Date();

            await pool.query(
              "INSERT INTO messages (chat_id, sender_id, role, content, created_at) VALUES (?, ?, ?, ?, ?)",
              [chatId, SYSTEM_ID, "dispatcher", WELCOME_CONTENT, time]
            );

            const welcomeMsg = {
              chatId,
              senderId: SYSTEM_ID,
              role: "dispatcher",
              content: WELCOME_CONTENT,
              created_at: time,
            };


            io.to(room).emit("newMessage", welcomeMsg);

            io.to("dispatcherRoom").emit("welcomeMessage", welcomeMsg);
          }
        }, 500);
      } catch (err) {
        socket.emit("error", "Không thể khởi tạo cuộc trò chuyện");
      }
    });


    socket.on("joinChat", async (chatId) => {
      const room = `chat_${chatId}`;
      socket.join(room);
    });


    socket.on("sendMessage", async (msg) => {
      const { chatId, senderId, role, content } = msg;


      if (!content || !content.trim()) return;

      const time = new Date();
      const room = `chat_${chatId}`;

      try {
        await pool.query(
          "INSERT INTO messages (chat_id, sender_id, role, content, created_at) VALUES (?, ?, ?, ?, ?)",
          [chatId, senderId, role, content, time]
        );

        const messageData = {
          chatId,
          senderId,
          role,
          content,
          created_at: time,
        };


        io.to(room).emit("newMessage", messageData);


        if (role === "customer") {
          io.to("dispatcherRoom").emit("customerMessage", messageData);
        }
      } catch (err) {
      }
    });


    socket.on("endChat", async (userId) => {
      try {

        await pool.query(
          "UPDATE chats SET status='closed', ended_at=NOW() WHERE customer_id=? AND status='active'",
          [userId]
        );


        let chatId = activeChats[userId];


        if (!chatId) {
          const [lastClosed] = await pool.query(
            "SELECT id FROM chats WHERE customer_id=? AND status='closed' ORDER BY ended_at DESC LIMIT 1",
            [userId]
          );
          if (lastClosed.length > 0) chatId = lastClosed[0].id;
        }

        if (chatId) {
          const room = `chat_${chatId}`;

          io.to(room).emit("chatEnded", { chatId });
          io.to("dispatcherRoom").emit("chatEnded", { chatId, userId });


          delete activeChats[userId];


          io.in(room).socketsLeave(room);
        }
      } catch (err) {
      }
    });


    socket.on("disconnect", () => {
      for (let id in onlineDrivers) {
        if (onlineDrivers[id] === socket.id) delete onlineDrivers[id];
      }
    });
  });


  return {
    sendNotificationToDriver: async (driverId, shipmentId, message, extra = {}) => {
      try {
        await pool.query(
          "INSERT INTO notifications (receiver_id, target_role, shipment_id, message) VALUES (?, 'driver', ?, ?)",
          [driverId, shipmentId, message]
        );
        const socketId = onlineDrivers[driverId];
        if (socketId) {
          io.to(socketId).emit("newAssignment", {
            shipmentId,
            message,
            service_type: extra.service_type || 'normal',
            tracking_code: extra.tracking_code || '',
          });
        } else {
        }
      } catch (err) {
      }
    },

    sendNotificationToDispatcher: async (dispatcherId, shipmentId, message) => {
      try {
        await pool.query(
          "INSERT INTO notifications (receiver_id, target_role, shipment_id, message) VALUES (?, 'dispatcher', ?, ?)",
          [dispatcherId, shipmentId, message]
        );
        io.to("dispatcherRoom").emit("newDispatcherNotification", {
          shipmentId,
          message,
          created_at: new Date(),
        });
      } catch (err) {
      }
    },

    sendNotificationToCustomer: async (customerId, shipmentId, message) => {
      try {
        await pool.query(
          "INSERT INTO notifications (receiver_id, target_role, shipment_id, message) VALUES (?, 'customer', ?, ?)",
          [customerId, shipmentId, message]
        );
        io.to(`customer_${customerId}`).emit("newCustomerNotification", {
          shipmentId,
          message,
          created_at: new Date(),
        });
      } catch (err) {
      }
    },
  };
}
