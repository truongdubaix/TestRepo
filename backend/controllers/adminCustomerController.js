import db from "../config/db.js";


// Lấy danh sách tất cả khách hàng
export const getAllCustomers = async (req, res) => {
  try {
    const [rows] = await db.query(`
      SELECT u.id, u.name, u.email, u.phone, u.status,
             (SELECT COUNT(*) FROM shipments s WHERE s.customer_id = u.id) AS total_orders
      FROM users u
      WHERE u.role = 'customer'
      ORDER BY u.created_at DESC
    `);
    res.json(rows);
  } catch (err) {
    res
      .status(500)
      .json({ message: "Lỗi server khi tải danh sách khách hàng" });
  }
};


export const updateCustomerStatus = async (req, res) => {
  try {
    const { id } = req.params;
    const { status } = req.body;
    await db.query("UPDATE users SET status = ? WHERE id = ?", [status, id]);
    res.json({ message: "✅ Cập nhật trạng thái thành công" });
  } catch (err) {
    res.status(500).json({ message: "Lỗi server khi cập nhật trạng thái" });
  }
};


export const deleteCustomer = async (req, res) => {
  try {
    const { id } = req.params;
    await db.query("DELETE FROM users WHERE id = ?", [id]);
    res.json({ message: "🗑️ Đã xóa khách hàng" });
  } catch (err) {
    res.status(500).json({ message: "Lỗi server khi xóa khách hàng" });
  }
};
