import db from "../config/db.js";



// Lấy danh sách phương tiện
export const getAllVehicles = async (req, res) => {
  try {
    const [rows] = await db.query(`
      SELECT 
        v.id, 
        v.plate_no, 
        v.type, 
        v.capacity_kg,  -- ✅ Sửa đúng tên cột trong DB
        v.status,
        d.name AS driver_name
      FROM vehicles v
      LEFT JOIN drivers d ON d.vehicle_id = v.id
      ORDER BY v.id DESC
    `);


    const data = rows.map((r) => ({
      ...r,
      capacity: r.capacity_kg,
    }));

    res.json(data);
  } catch (error) {
    res.status(500).json({ message: "Lỗi khi lấy danh sách xe" });
  }
};

export const getAvailableVehicles = async (req, res) => {
  try {
    const [rows] = await db.query(`
      SELECT v.*, v.capacity_kg AS capacity -- ✅ Alias về capacity cho khớp frontend
      FROM vehicles v
      LEFT JOIN drivers d ON d.vehicle_id = v.id
      WHERE d.vehicle_id IS NULL AND v.status = 'available'
      ORDER BY v.id DESC
    `);
    res.json(rows);
  } catch (error) {
    res.status(500).json({ message: "Lỗi khi lấy danh sách xe trống" });
  }
};




// Thêm phương tiện mới
export const createVehicle = async (req, res) => {
  try {

    const { plate_no, type, capacity, status } = req.body;


    if (!plate_no || !type) {
      return res
        .status(400)
        .json({ message: "Thiếu thông tin biển số hoặc loại xe" });
    }


    const [exist] = await db.query(
      "SELECT id FROM vehicles WHERE plate_no = ?",
      [plate_no]
    );
    if (exist.length > 0) {
      return res.status(400).json({ message: "Biển số xe đã tồn tại!" });
    }


    const capValue = capacity ? parseFloat(capacity) : 0;


    await db.query(
      "INSERT INTO vehicles (plate_no, type, capacity_kg, status, created_at) VALUES (?, ?, ?, ?, NOW())",
      [plate_no, type, capValue, status || "available"]
    );

    res.json({ message: "✅ Thêm phương tiện thành công" });
  } catch (err) {
    res.status(500).json({ message: "Lỗi khi thêm xe: " + err.message });
  }
};


// Cập nhật thông tin phương tiện
export const updateVehicle = async (req, res) => {
  try {
    const { plate_no, type, capacity, status } = req.body;
    const { id } = req.params;


    const [exist] = await db.query(
      "SELECT id FROM vehicles WHERE plate_no = ? AND id != ?",
      [plate_no, id]
    );
    if (exist.length > 0)
      return res.status(400).json({ message: "Biển số xe đã tồn tại!" });

    const capValue = capacity ? parseFloat(capacity) : 0;


    await db.query(
      "UPDATE vehicles SET plate_no=?, type=?, capacity_kg=?, status=?, updated_at=NOW() WHERE id=?",
      [plate_no, type, capValue, status, id]
    );

    res.json({ message: "✅ Cập nhật xe thành công" });
  } catch (err) {
    res.status(500).json({ message: "Lỗi khi cập nhật xe" });
  }
};


// Xóa phương tiện
export const deleteVehicle = async (req, res) => {
  try {
    const { id } = req.params;


    const [driver] = await db.query(
      "SELECT id, name FROM drivers WHERE vehicle_id = ?",
      [id]
    );
    if (driver.length > 0) {
      return res.status(400).json({
        message: `Không thể xóa! Xe đang được sử dụng bởi tài xế: ${driver[0].name}`,
      });
    }

    await db.query("DELETE FROM vehicles WHERE id=?", [id]);
    res.json({ message: "🗑️ Đã xóa phương tiện" });
  } catch (err) {
    res.status(500).json({ message: "Lỗi khi xóa xe" });
  }
};
