import db from "../config/db.js";
import bcrypt from "bcryptjs";
import { sendNotificationToCustomer } from "../server.js";


// Lấy dữ liệu dashboard tài xế
export const getDriverDashboard = async (req, res) => {
  try {
    const { id } = req.params;


    const [driverRecords] = await db.query(
      "SELECT id, name, latitude, longitude FROM drivers WHERE user_id = ?",
      [id]
    );

    const driverIds = driverRecords.length > 0
      ? driverRecords.map(d => d.id)
      : [id];

    const placeholders = driverIds.map(() => '?').join(',');


    const [rows] = await db.query(
      `
      SELECT 
        COUNT(CASE WHEN s.status = 'completed' THEN 1 END) AS completed,
        COUNT(CASE WHEN s.status = 'delivering' THEN 1 END) AS delivering,
        COUNT(CASE WHEN s.status = 'picking' THEN 1 END) AS picking,
        COUNT(CASE WHEN s.status = 'assigned' THEN 1 END) AS assigned
      FROM shipments s
      JOIN assignments a ON s.id = a.shipment_id
      WHERE a.driver_id IN (${placeholders})
      `,
      driverIds,
    );

    const stats = rows[0] || {
      completed: 0,
      delivering: 0,
      picking: 0,
      assigned: 0,
    };


    const [recent] = await db.query(
      `
      SELECT 
        s.id, 
        s.tracking_code, 
        s.receiver_name, 
        s.status, 
        s.service_type,
        s.updated_at 
      FROM shipments s
      JOIN assignments a ON s.id = a.shipment_id
      WHERE a.driver_id IN (${placeholders})
      ORDER BY 
        CASE WHEN s.service_type = 'fast' AND s.status NOT IN ('completed','failed') THEN 0 ELSE 1 END,
        s.updated_at DESC
      LIMIT 5
      `,
      driverIds,
    );


    const driverInfo = driverRecords[0] || null;


    res.json({
      completed: stats.completed,
      delivering: stats.delivering,
      picking: stats.picking,
      assigned: stats.assigned,
      recentShipments: recent,
      latitude: driverInfo?.latitude || null,
      longitude: driverInfo?.longitude || null,
      driverName: driverInfo?.name || null,
    });
  } catch (err) {
    res.status(500).json({ message: err.message || "Lỗi khi lấy dashboard" });
  }
};


// Lấy đơn hàng được phân công cho tài xế
export const getDriverAssignments = async (req, res) => {
  try {
    const { id } = req.params;


    const [driverRecords] = await db.query(
      "SELECT id FROM drivers WHERE user_id = ?",
      [id]
    );


    const driverIds = driverRecords.length > 0
      ? driverRecords.map(d => d.id)
      : [id];


    const placeholders = driverIds.map(() => '?').join(',');
    const [rows] = await db.query(
      `
      SELECT 
        s.id AS shipment_id,
        s.tracking_code,
        s.delivery_address,
        s.pickup_address,
        s.receiver_name,
        s.receiver_phone,
        s.service_type,
        s.cod_amount,
        s.status,
        a.status AS assignment_status,
        a.assigned_at,
        a.driver_id
      FROM assignments a
      JOIN shipments s ON s.id = a.shipment_id
      WHERE a.driver_id IN (${placeholders})
        AND a.status IN ('assigned', 'picking', 'delivering')
      ORDER BY 
        CASE WHEN s.service_type = 'fast' THEN 0 ELSE 1 END,
        a.assigned_at DESC
      `,
      driverIds,
    );
    res.json(rows);
  } catch (err) {
    res.status(500).json({ message: "Lỗi khi lấy danh sách đơn tài xế" });
  }
};


// Lấy lịch sử giao hàng của tài xế
export const getDriverHistory = async (req, res) => {
  try {
    const { id } = req.params;


    const [driverRecords] = await db.query(
      "SELECT id FROM drivers WHERE user_id = ?",
      [id]
    );
    const driverIds = driverRecords.length > 0
      ? driverRecords.map(d => d.id)
      : [id];

    const placeholders = driverIds.map(() => '?').join(',');

    const [rows] = await db.query(
      `
      SELECT 
        s.id AS shipment_id,
        s.tracking_code,
        s.delivery_address,
        s.receiver_name,
        s.receiver_phone,
        s.service_type,
        s.status,
        s.failure_note,
        s.updated_at AS completed_at
      FROM assignments a
      JOIN shipments s ON s.id = a.shipment_id
      WHERE a.driver_id IN (${placeholders})
        AND a.status IN ('completed', 'failed')
      ORDER BY s.updated_at DESC
      `,
      driverIds,
    );
    res.json(rows);
  } catch (err) {
    res.status(500).json({ message: "Lỗi khi lấy lịch sử giao hàng" });
  }
};


export const updateDriverShipmentStatus = async (req, res) => {
  try {
    const { shipment_id } = req.params;
    const { status, note } = req.body;


    if (status === 'failed' && note) {
      await db.query(
        "UPDATE shipments SET status = ?, failure_note = ?, updated_at = NOW() WHERE id = ?",
        [status, note, shipment_id]
      );
    } else {
      await db.query(
        "UPDATE shipments SET status = ?, updated_at = NOW() WHERE id = ?",
        [status, shipment_id]
      );
    }

    await db.query("UPDATE assignments SET status = ? WHERE shipment_id = ?", [
      status,
      shipment_id,
    ]);


    try {
      const [shipment] = await db.query(
        "SELECT customer_id, tracking_code FROM shipments WHERE id = ?",
        [shipment_id]
      );
      if (shipment.length > 0 && shipment[0].customer_id) {
        const { customer_id, tracking_code } = shipment[0];

        let msg = `Đơn hàng #${tracking_code} đã được cập nhật trạng thái mới.`;
        if (status === 'picking') msg = `Tài xế đang trên đường đến lấy đơn hàng #${tracking_code}.`;
        else if (status === 'delivering') msg = `Đơn hàng #${tracking_code} đang được giao đến bạn.`;
        else if (status === 'completed') msg = `✅ Đơn hàng #${tracking_code} đã được giao thành công!`;
        else if (status === 'failed') msg = `❌ Đơn hàng #${tracking_code} giao thất bại${note ? `: ${note}` : '.'}.`;

        await sendNotificationToCustomer(customer_id, shipment_id, msg);
      }
    } catch (e) {
    }

    res.json({ message: "✅ Cập nhật trạng thái thành công" });
  } catch (err) {
    res.status(500).json({ message: "Lỗi khi cập nhật trạng thái" });
  }
};


export const getDriverProfile = async (req, res) => {
  try {
    const { id } = req.params;


    let [rows] = await db.query(
      `
      SELECT 
        d.id, 
        d.name, 
        d.email, 
        d.phone, 
        d.status,
        d.vehicle_type,
        d.license_no,
        d.region_id,
        v.plate_no,
        v.type,
        v.capacity_kg,
        v.status AS vehicle_status
      FROM drivers d
      LEFT JOIN vehicles v ON d.vehicle_id = v.id
      WHERE d.user_id = ?
      `,
      [id],
    );


    if (rows.length === 0) {
      [rows] = await db.query(
        `
        SELECT 
          d.id, 
          d.name, 
          d.email, 
          d.phone, 
          d.status,
          d.vehicle_type,
          d.license_no,
          d.region_id,
          v.plate_no,
          v.type,
          v.capacity_kg,
          v.status AS vehicle_status
        FROM drivers d
        LEFT JOIN vehicles v ON d.vehicle_id = v.id
        WHERE d.id = ?
        `,
        [id],
      );
    }

    if (rows.length === 0)
      return res.status(404).json({ message: "Không tìm thấy tài xế" });

    res.json(rows[0]);
  } catch (err) {
    res.status(500).json({ message: "Lỗi khi lấy thông tin tài xế" });
  }
};


export const changeDriverPassword = async (req, res) => {
  try {
    const { id } = req.params;
    const { oldPassword, newPassword } = req.body;

    const [[driver]] = await db.query(
      "SELECT password FROM drivers WHERE id = ?",
      [id],
    );
    if (!driver)
      return res.status(404).json({ message: "Không tìm thấy tài xế" });

    const isMatch = await bcrypt.compare(oldPassword, driver.password);
    if (!isMatch)
      return res.status(400).json({ message: "Mật khẩu cũ không đúng" });

    const hash = await bcrypt.hash(newPassword, 10);
    await db.query("UPDATE drivers SET password = ? WHERE id = ?", [hash, id]);

    res.json({ message: "✅ Đổi mật khẩu thành công" });
  } catch (err) {
    res.status(500).json({ message: "Lỗi khi đổi mật khẩu" });
  }
};


export const updateDriverVehicle = async (req, res) => {
  try {
    const { id } = req.params;
    const { vehicle_id } = req.body;


    const [[vehicle]] = await db.query("SELECT * FROM vehicles WHERE id = ?", [
      vehicle_id,
    ]);
    if (!vehicle) return res.status(404).json({ message: "Xe không tồn tại" });


    await db.query("UPDATE drivers SET vehicle_id = ? WHERE id = ?", [
      vehicle_id,
      id,
    ]);

    res.json({ message: "✅ Cập nhật xe cho tài xế thành công" });
  } catch (error) {
    res.status(500).json({ message: "Lỗi server khi cập nhật xe cho tài xế" });
  }
};

export const getDriverProfileByUser = async (req, res) => {
  try {
    const { userId } = req.params;

    const [rows] = await db.query(
      `
      SELECT 
        d.id,
        d.user_id,
        d.name,
        d.email,
        d.phone,
        d.status,
        v.plate_no,
        v.type,
        v.capacity_kg,
        v.status AS vehicle_status
      FROM drivers d
      LEFT JOIN vehicles v ON d.vehicle_id = v.id
      WHERE d.user_id = ?
      `,
      [userId],
    );

    if (!rows.length)
      return res.status(404).json({ message: "Không tìm thấy tài xế" });

    res.json(rows[0]);
  } catch (err) {
    res.status(500).json({ message: "Lỗi khi lấy thông tin tài xế" });
  }
};
