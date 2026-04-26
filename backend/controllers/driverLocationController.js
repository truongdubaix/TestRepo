import db from "../config/db.js";


// Cập nhật vị trí GPS tài xế
export const updateDriverLocation = async (req, res) => {
  try {
    const { driver_id, latitude, longitude } = req.body;
    if (!driver_id || !latitude || !longitude)
      return res.status(400).json({ message: "Thiếu thông tin vị trí" });

    await db.query(
      `UPDATE drivers SET latitude = ?, longitude = ? WHERE id = ?`,
      [latitude, longitude, driver_id]
    );

    res.json({ message: "✅ Cập nhật vị trí thành công" });
  } catch (err) {
    res.status(500).json({ message: "Lỗi server khi cập nhật vị trí" });
  }
};
