import db from "../config/db.js";

// Lấy danh sách địa chỉ người dùng
export const getAddresses = async (req, res) => {
  try {
    const { customer_id } = req.params;

    if (!customer_id) return res.status(400).json({ error: "Thiếu ID" });

    const [rows] = await db.query(
      "SELECT * FROM customer_addresses WHERE user_id = ? ORDER BY is_default DESC, created_at DESC",
      [customer_id],
    );

    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: "Lỗi server" });
  }
};

// Thêm địa chỉ mới
export const createAddress = async (req, res) => {
  try {
    const { customer_id, name, phone, address, type, is_default } = req.body;

    if (!customer_id || !name || !phone || !address) {
      return res.status(400).json({ error: "Thiếu thông tin" });
    }

    if (is_default) {
      await db.query(
        "UPDATE customer_addresses SET is_default = 0 WHERE user_id = ?",
        [customer_id],
      );
    }

    const [existing] = await db.query(
      "SELECT id FROM customer_addresses WHERE user_id = ?",
      [customer_id],
    );
    const shouldBeDefault = is_default || existing.length === 0;

    const isDefaultVal = shouldBeDefault ? 1 : 0;

    await db.query(
      "INSERT INTO customer_addresses (user_id, name, phone, address, type, is_default) VALUES (?, ?, ?, ?, ?, ?)",
      [customer_id, name, phone, address, type || "other", isDefaultVal],
    );

    res.status(201).json({ message: "Thêm thành công" });
  } catch (err) {
    res.status(500).json({ error: "Lỗi thêm địa chỉ" });
  }
};

// Cập nhật địa chỉ
export const updateAddress = async (req, res) => {
  try {
    const { id } = req.params;
    const { customer_id, name, phone, address, type, is_default } = req.body;

    if (is_default) {
      await db.query(
        "UPDATE customer_addresses SET is_default = 0 WHERE user_id = ?",
        [customer_id],
      );
    }

    const isDefaultVal = is_default ? 1 : 0;

    await db.query(
      "UPDATE customer_addresses SET name = ?, phone = ?, address = ?, type = ?, is_default = ? WHERE id = ? AND user_id = ?",
      [name, phone, address, type, isDefaultVal, id, customer_id],
    );

    res.json({ message: "Cập nhật thành công" });
  } catch (err) {
    res.status(500).json({ error: "Lỗi cập nhật" });
  }
};

// Xóa địa chỉ
export const deleteAddress = async (req, res) => {
  try {
    const { id } = req.params;

    await db.query("DELETE FROM customer_addresses WHERE id = ?", [id]);

    res.json({ message: "Xóa thành công" });
  } catch (err) {
    res.status(500).json({ error: "Lỗi xóa" });
  }
};
