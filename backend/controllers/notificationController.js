import db from "../config/db.js";


export const getDriverNotifications = async (req, res) => {
  try {
    const { id } = req.params;
    const [rows] = await db.query(
      "SELECT * FROM notifications WHERE receiver_id=? AND target_role='driver' ORDER BY created_at DESC",
      [id]
    );
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: "Không thể lấy danh sách thông báo" });
  }
};


export const getDispatcherNotifications = async (req, res) => {
  try {
    const { id } = req.params;
    const [rows] = await db.query(
      "SELECT * FROM notifications WHERE receiver_id=? AND target_role='dispatcher' ORDER BY created_at DESC",
      [id]
    );
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: "Không thể lấy danh sách thông báo" });
  }
};


export const markNotificationRead = async (req, res) => {
  try {
    const { id } = req.params;
    await db.query("UPDATE notifications SET is_read=1 WHERE id=?", [id]);
    res.json({ message: "✅ Đã đánh dấu đã đọc" });
  } catch (err) {
    res.status(500).json({ error: "Không thể cập nhật thông báo" });
  }
};


export const getCustomerNotifications = async (req, res) => {
  try {
    const { id } = req.params;
    const [rows] = await db.query(
      "SELECT * FROM notifications WHERE receiver_id=? AND target_role='customer' ORDER BY created_at DESC LIMIT 50",
      [id]
    );
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: "Không thể lấy danh sách thông báo" });
  }
};


export const markAllCustomerRead = async (req, res) => {
  try {
    const { id } = req.params;
    await db.query(
      "UPDATE notifications SET is_read=1 WHERE receiver_id=? AND target_role='customer' AND is_read=0",
      [id]
    );
    res.json({ message: "✅ Đã đánh dấu tất cả đã đọc" });
  } catch (err) {
    res.status(500).json({ error: "Không thể cập nhật" });
  }
};
