import pool from "../config/db.js";


export const startChat = async (req, res) => {
  const { customer_id } = req.body;
  try {
    let [rows] = await pool.query(
      "SELECT * FROM chats WHERE customer_id = ? AND status='active'",
      [customer_id]
    );

    let chatId;
    if (rows.length > 0) {
      chatId = rows[0].id;
    } else {
      const [result] = await pool.query(
        "INSERT INTO chats (customer_id, status) VALUES (?, 'active')",
        [customer_id]
      );
      chatId = result.insertId;
    }

    res.json({ chatId });
  } catch (err) {
    res.status(500).json({ error: "Server error" });
  }
};


export const getMessages = async (req, res) => {
  const { chatId } = req.params;
  try {
    const [rows] = await pool.query(
      "SELECT * FROM messages WHERE chat_id = ? ORDER BY created_at ASC",
      [chatId]
    );
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: "Server error" });
  }
};


export const saveMessage = async (chatId, senderId, role, content) => {
  try {
    await pool.query(
      "INSERT INTO messages (chat_id, sender_id, role, content, created_at) VALUES (?, ?, ?, ?, NOW())",
      [chatId, senderId, role, content]
    );
  } catch (err) {
  }
};


export const endChat = async (req, res) => {
  const { chatId } = req.params;
  try {
    await pool.query(
      "UPDATE chats SET status='closed', ended_at=NOW() WHERE id=?",
      [chatId]
    );
    res.json({ message: "✅ Chat đã kết thúc" });
  } catch (err) {
    res.status(500).json({ error: "Server error" });
  }
};
