import db from "../config/db.js";


// Gửi đánh giá/phản hồi
export const createFeedback = async (req, res) => {
  try {
    const { customer_id, shipment_id, content, rating } = req.body;

    if (!customer_id || !shipment_id || !content || !rating) {
      return res.status(400).json({ message: "Thiếu dữ liệu đánh giá" });
    }

    await db.query(
      `INSERT INTO feedbacks (customer_id, shipment_id, content, rating, created_at)
       VALUES (?, ?, ?, ?, NOW())`,
      [customer_id, shipment_id, content, rating]
    );

    res.json({ message: "✅ Feedback submitted successfully" });
  } catch (err) {
    res.status(500).json({ message: "Lỗi server khi gửi feedback" });
  }
};

export const getAllFeedbacks = async (req, res) => {
  try {
    const [rows] = await db.query(`
      SELECT f.*, u.name AS customer_name, s.tracking_code
      FROM feedbacks f
      JOIN users u ON f.customer_id = u.id
      JOIN shipments s ON f.shipment_id = s.id
      ORDER BY f.created_at DESC
    `);
    res.json(rows);
  } catch (err) {
    res.status(500).json({ message: "Lỗi server khi tải danh sách feedbacks" });
  }
};


// Xóa đánh giá
export const deleteFeedback = async (req, res) => {
  try {
    const { id } = req.params;
    await db.query("DELETE FROM feedbacks WHERE id = ?", [id]);
    res.json({ message: "🗑️ Đã xóa feedback" });
  } catch (err) {
    res.status(500).json({ message: "Lỗi server khi xóa feedback" });
  }
};
