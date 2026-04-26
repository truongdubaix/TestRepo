import db from "../config/db.js";




// Lấy danh sách tất cả tài xế
export const getAllDrivers = async (req, res) => {
  try {
    const [rows] = await db.query(`
      SELECT 
        d.id, d.name, d.email, d.phone, d.status,
        d.region_id,
        d.latitude, d.longitude,
        d.vehicle_id,
        v.plate_no, 
        v.type AS vehicle_type, 
        v.capacity_kg AS capacity
      FROM drivers d
      LEFT JOIN vehicles v ON d.vehicle_id = v.id
      ORDER BY d.id DESC
    `);
    res.json(rows);
  } catch (err) {
    res.status(500).json({ message: "Lỗi khi lấy danh sách tài xế" });
  }
};


// Lấy thông tin tài xế theo ID
export const getDriverById = async (req, res) => {
  try {
    const [rows] = await db.query(
      `
      SELECT 
        d.*, 
        v.plate_no, 
        v.type AS vehicle_type,
        v.capacity_kg AS capacity -- ✅ Sửa thêm ở đây cho chắc chắn (nếu cần hiển thị chi tiết)
      FROM drivers d
      LEFT JOIN vehicles v ON d.vehicle_id = v.id
      WHERE d.id = ?
    `,
      [req.params.id]
    );

    if (rows.length === 0)
      return res.status(404).json({ message: "Không tìm thấy tài xế" });
    res.json(rows[0]);
  } catch (err) {
    res.status(500).json({ message: "Lỗi server" });
  }
};

// Thêm tài xế mới
export const createDriver = async (req, res) => {
  try {
    const { name, email, phone, status } = req.body;


    const [exist] = await db.query("SELECT id FROM drivers WHERE email = ?", [
      email,
    ]);
    if (exist.length > 0)
      return res.status(400).json({ message: "Email đã tồn tại" });


    await db.query(
      "INSERT INTO drivers (name, email, phone, status, created_at) VALUES (?, ?, ?, ?, NOW())",
      [name, email, phone, status || "available"]
    );
    res.json({ message: "✅ Đã thêm tài xế mới" });
  } catch (err) {
    res.status(500).json({ message: "Lỗi khi thêm tài xế" });
  }
};


// Cập nhật thông tin tài xế
export const updateDriver = async (req, res) => {
  try {
    const { name, email, phone, status } = req.body;
    await db.query(
      "UPDATE drivers SET name=?, email=?, phone=?, status=?, updated_at=NOW() WHERE id=?",
      [name, email, phone, status, req.params.id]
    );
    res.json({ message: "✅ Cập nhật thành công" });
  } catch (err) {
    res.status(500).json({ message: "Lỗi cập nhật" });
  }
};


// Xóa tài xế
export const deleteDriver = async (req, res) => {
  const conn = await db.getConnection();
  try {
    await conn.beginTransaction();


    const [driver] = await conn.query(
      "SELECT vehicle_id FROM drivers WHERE id = ?",
      [req.params.id]
    );
    if (driver.length > 0 && driver[0].vehicle_id) {
      await conn.query(
        "UPDATE vehicles SET status = 'available' WHERE id = ?",
        [driver[0].vehicle_id]
      );
    }


    await conn.query("DELETE FROM drivers WHERE id = ?", [req.params.id]);

    await conn.commit();
    res.json({ message: "🗑️ Đã xóa tài xế và cập nhật trạng thái xe" });
  } catch (err) {
    await conn.rollback();
    res.status(500).json({ message: "Lỗi khi xóa" });
  } finally {
    conn.release();
  }
};


// Cập nhật trạng thái tài xế
export const updateDriverStatus = async (req, res) => {
  try {
    const { status } = req.body;
    await db.query("UPDATE drivers SET status=? WHERE id=?", [
      status,
      req.params.id,
    ]);
    res.json({ message: "✅ Trạng thái đã được cập nhật" });
  } catch (err) {
    res.status(500).json({ message: "Lỗi cập nhật trạng thái" });
  }
};


export const assignVehicleToDriver = async (req, res) => {
  const { id } = req.params;
  const { vehicle_id } = req.body;

  const conn = await db.getConnection();
  try {
    await conn.beginTransaction();


    const [current] = await conn.query(
      "SELECT vehicle_id FROM drivers WHERE id = ?",
      [id]
    );
    if (current.length > 0 && current[0].vehicle_id) {
      await conn.query(
        "UPDATE vehicles SET status = 'available' WHERE id = ?",
        [current[0].vehicle_id]
      );
    }


    await conn.query("UPDATE drivers SET vehicle_id = ? WHERE id = ?", [
      vehicle_id,
      id,
    ]);


    await conn.query("UPDATE vehicles SET status = 'busy' WHERE id = ?", [
      vehicle_id,
    ]);

    await conn.commit();
    res.json({ message: "🚗 Đã gán xe thành công" });
  } catch (err) {
    await conn.rollback();
    res.status(500).json({ message: "Lỗi khi gán xe" });
  } finally {
    conn.release();
  }
};




export const getDriverApplications = async (req, res) => {
  try {
    const [rows] = await db.query(
      "SELECT * FROM driver_applications ORDER BY created_at DESC"
    );
    res.json(rows);
  } catch (err) {
    res.status(500).json({ message: "Lỗi lấy danh sách hồ sơ" });
  }
};


// Duyệt đơn đăng ký tài xế
export const approveApplication = async (req, res) => {
  const { id } = req.params;
  const conn = await db.getConnection();

  try {
    await conn.beginTransaction();


    const [apps] = await conn.query(
      "SELECT * FROM driver_applications WHERE id = ?",
      [id]
    );
    if (apps.length === 0)
      return res.status(404).json({ message: "Hồ sơ không tồn tại" });
    const app = apps[0];


    const [exist] = await conn.query("SELECT id FROM drivers WHERE email = ?", [
      app.email,
    ]);
    if (exist.length > 0) {

      await conn.query(
        "UPDATE driver_applications SET status = 'approved' WHERE id = ?",
        [id]
      );
      await conn.commit();
      return res.json({
        message: "Email tài xế đã tồn tại. Đã cập nhật trạng thái hồ sơ.",
      });
    }


    await conn.query(
      "INSERT INTO drivers (name, email, phone, status, created_at) VALUES (?, ?, ?, 'available', NOW())",
      [app.name, app.email, app.phone]
    );


    await conn.query(
      "UPDATE driver_applications SET status = 'approved' WHERE id = ?",
      [id]
    );

    await conn.commit();
    res.json({ message: "✅ Đã duyệt hồ sơ và tạo tài khoản tài xế" });
  } catch (err) {
    await conn.rollback();
    res.status(500).json({ message: "Lỗi khi duyệt hồ sơ" });
  } finally {
    conn.release();
  }
};


// Từ chối đơn đăng ký tài xế
export const rejectApplication = async (req, res) => {
  try {
    await db.query(
      "UPDATE driver_applications SET status = 'rejected' WHERE id = ?",
      [req.params.id]
    );
    res.json({ message: "❌ Đã từ chối hồ sơ" });
  } catch (err) {
    res.status(500).json({ message: "Lỗi khi từ chối" });
  }
};
