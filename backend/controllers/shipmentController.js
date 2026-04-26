import pool from "../config/db.js";
import {
  sendNotificationToDriver,
  sendNotificationToDispatcher,
  sendNotificationToCustomer,
} from "../server.js";


// Lấy danh sách tất cả đơn hàng
export const getAllShipments = async (req, res) => {
  try {
    const currentUser = req.user;
    const userRegion = currentUser?.region_id;

    let sql = `
      SELECT
        s.*,
        (
          SELECT d.name FROM assignments a
          JOIN drivers d ON d.id = a.driver_id
          WHERE a.shipment_id = s.id
          ORDER BY a.assigned_at DESC LIMIT 1
        ) AS driver_name,
        (
          SELECT d.phone FROM assignments a
          JOIN drivers d ON d.id = a.driver_id
          WHERE a.shipment_id = s.id
          ORDER BY a.assigned_at DESC LIMIT 1
        ) AS driver_phone
      FROM shipments s
    `;
    let params = [];

    if (userRegion) {
      sql += " WHERE s.region_id = ?";
      params.push(userRegion);
    }

    sql += " ORDER BY s.created_at DESC";

    const [rows] = await pool.query(sql, params);
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: "Không thể lấy danh sách đơn hàng" });
  }
};


// Lấy chi tiết đơn hàng theo ID
export const getShipmentById = async (req, res) => {
  try {
    const { id } = req.params;
    const [rows] = await pool.query("SELECT * FROM shipments WHERE id = ?", [
      id,
    ]);
    if (!rows.length)
      return res.status(404).json({ error: "Không tìm thấy đơn hàng" });
    res.json(rows[0]);
  } catch (err) {
    res.status(500).json({ error: "Không thể lấy chi tiết đơn hàng" });
  }
};


const getRegionInfoFromAddress = (address) => {
  if (!address) return { prefix: "SP", region_id: "OTHER" };

  const addrLower = address.toLowerCase();


  if (
    addrLower.includes("hồ chí minh") ||
    addrLower.includes("hcm") ||
    addrLower.includes("sài gòn") ||
    addrLower.includes("bình dương") ||
    addrLower.includes("đồng nai") ||
    addrLower.includes("long an")
  ) {
    return { prefix: "HCM", region_id: "HCM" };
  }


  if (
    addrLower.includes("đà nẵng") ||
    addrLower.includes("da nang") ||
    addrLower.includes("quảng nam") ||
    addrLower.includes("huế")
  ) {
    return { prefix: "DN", region_id: "DN" };
  }


  if (
    addrLower.includes("hà nội") ||
    addrLower.includes("ha noi") ||
    addrLower.includes("hưng yên") ||
    addrLower.includes("bắc ninh")
  ) {
    return { prefix: "HN", region_id: "HN" };
  }


  return { prefix: "SP", region_id: "OTHER" };
};


// Tạo đơn hàng mới
export const createShipment = async (req, res) => {
  try {
    const {
      sender_name,
      sender_phone,
      receiver_name,
      receiver_phone,
      pickup_address,
      pickup_lat,
      pickup_lng,
      delivery_address,
      delivery_lat,
      delivery_lng,
      item_name,
      quantity,
      weight_kg,
      cod_amount,
      shipping_fee,
      payment_method,
      pickup_option,
      service_type,
      status,
      customer_id,
    } = req.body;


    const addressToCheck = pickup_address || delivery_address;
    const regionInfo = getRegionInfoFromAddress(addressToCheck);


    const randomSuffix = Date.now().toString().slice(-6);
    const tracking_code = `${regionInfo.prefix}-${randomSuffix}`;
    const finalRegionId = regionInfo.region_id;


    const q = `
      INSERT INTO shipments 
      (customer_id, tracking_code, sender_name, sender_phone, pickup_address, pickup_lat, pickup_lng, 
       receiver_name, receiver_phone, delivery_address, delivery_lat, delivery_lng, 
       item_name, quantity, weight_kg, cod_amount, shipping_fee, 
       payment_method, pickup_option, service_type, status, region_id, created_at) 
      VALUES (?)
    `;

    const values = [
      customer_id,
      tracking_code,
      sender_name,
      sender_phone,
      pickup_address,
      pickup_lat || null,
      pickup_lng || null,
      receiver_name,
      receiver_phone,
      delivery_address,
      delivery_lat || null,
      delivery_lng || null,
      item_name,
      quantity,
      weight_kg,
      cod_amount,
      shipping_fee,
      payment_method,
      pickup_option,
      service_type,
      status || "pending",
      finalRegionId,
      new Date(),
    ];

    const [result] = await pool.query(q, [values]);


    try {
      await sendNotificationToDispatcher(
        1,
        result.insertId,
        `🆕 Đơn hàng mới tại ${regionInfo.prefix}: #${tracking_code}`,
      );


      if (customer_id) {
        await sendNotificationToCustomer(
          customer_id,
          result.insertId,
          `🎉 Đơn hàng #${tracking_code} của bạn đã được tạo thành công!`,
        );
      }
    } catch (notifyErr) {
    }

    res.status(201).json({
      message: "Tạo đơn hàng thành công",
      id: result.insertId,
      tracking_code: tracking_code,
      region: finalRegionId,
    });
  } catch (err) {
    res
      .status(500)
      .json({ error: "Lỗi server khi tạo đơn hàng", details: err.message });
  }
};


export const updateShipment = async (req, res) => {
  try {
    const { id } = req.params;
    const {
      sender_name,
      sender_phone,
      receiver_name,
      receiver_phone,
      pickup_address,
      delivery_address,
      weight_kg,
      cod_amount,
      status,
      current_location,
    } = req.body;

    await pool.query(
      `UPDATE shipments SET
        sender_name=?, sender_phone=?, receiver_name=?, receiver_phone=?,
        pickup_address=?, delivery_address=?, weight_kg=?, cod_amount=?,
        status=?, current_location=?, updated_at=NOW()
       WHERE id=?`,
      [
        sender_name,
        sender_phone,
        receiver_name,
        receiver_phone,
        pickup_address,
        delivery_address,
        weight_kg,
        cod_amount,
        status,
        current_location,
        id,
      ],
    );

    res.json({ message: "Cập nhật thành công" });
  } catch (err) {
    res.status(500).json({ error: "Không thể cập nhật đơn hàng" });
  }
};


// Xóa đơn hàng
export const deleteShipment = async (req, res) => {
  try {
    const { id } = req.params;
    await pool.query("DELETE FROM shipments WHERE id=?", [id]);
    res.json({ message: "Đã xóa đơn hàng" });
  } catch (err) {
    res.status(500).json({ error: "Không thể xóa đơn hàng" });
  }
};


// Phân công đơn hàng cho tài xế
export const assignShipment = async (req, res) => {
  try {
    const { driver_id, shipment_id } = req.body;


    await pool.query(
      "UPDATE shipments SET status='assigned', updated_at=NOW() WHERE id=?",
      [shipment_id],
    );


    await pool.query(
      "INSERT INTO assignments (shipment_id, driver_id, status, assigned_at) VALUES (?, ?, 'assigned', NOW())",
      [shipment_id, driver_id],
    );


    try {
      await sendNotificationToDriver(
        driver_id,
        shipment_id,
        `Bạn được phân công đơn #${shipment_id}`,
      );
    } catch (e) {
    }


    try {
      const [[shipment]] = await pool.query(
        "SELECT customer_id, tracking_code FROM shipments WHERE id = ?",
        [shipment_id]
      );
      if (shipment && shipment.customer_id) {
        await sendNotificationToCustomer(
          shipment.customer_id,
          shipment_id,
          `🚚 Đơn hàng #${shipment.tracking_code} đã được phân công cho tài xế và đang chờ đi lấy!`
        );
      }
    } catch (e) {
    }

    res.json({ message: "Đã phân công tài xế" });
  } catch (err) {
    res.status(500).json({ error: "Không thể phân công" });
  }
};


export const getShipmentByCode = async (req, res) => {
  try {
    const { code } = req.params;
    const [[shipment]] = await pool.query(
      "SELECT * FROM shipments WHERE tracking_code=?",
      [code],
    );

    if (!shipment)
      return res.status(404).json({ message: "Không tìm thấy đơn hàng" });

    res.json(shipment);
  } catch (err) {
    res.status(500).json({ message: "Lỗi server" });
  }
};


export const getShipmentByCodePublic = async (req, res) => {
  try {
    const { code } = req.params;
    const { last4 } = req.query;

    if (!code) {
      return res.status(400).json({ message: "Thiếu mã vận đơn" });
    }

    const [[shipment]] = await pool.query(
      "SELECT * FROM shipments WHERE tracking_code = ?",
      [code],
    );

    if (!shipment) {
      return res.status(404).json({ message: "Không tìm thấy đơn hàng" });
    }


    if (last4) {
      const phone = shipment.receiver_phone || "";
      if (!phone.endsWith(last4)) {
        return res.status(403).json({ message: "Sai thông tin xác thực" });
      }
    }

    res.json(shipment);
  } catch (err) {
    res.status(500).json({ message: "Lỗi server" });
  }
};


// Phân công hàng loạt đơn hàng
export const assignShipmentsBulk = async (req, res) => {
  const { shipment_ids, driver_id } = req.body;

  if (
    !shipment_ids ||
    !Array.isArray(shipment_ids) ||
    shipment_ids.length === 0 ||
    !driver_id
  ) {
    return res
      .status(400)
      .json({ message: "Dữ liệu không hợp lệ (Thiếu ID đơn hoặc Tài xế)" });
  }


  const currentUser = req.user;

  if (currentUser && currentUser.region_id) {
    try {

      const [driver] = await pool.query(
        "SELECT region_id FROM drivers WHERE id = ?",
        [driver_id]
      );

      if (driver.length === 0) {
        return res.status(404).json({ message: "Không tìm thấy tài xế!" });
      }


      const driverRegion = driver[0].region_id;
      if (driverRegion && driverRegion !== currentUser.region_id) {
        return res.status(403).json({
          message: `Tài xế thuộc khu vực ${driverRegion}, không phải khu vực của bạn (${currentUser.region_id})!`
        });
      }


      const [invalidShipments] = await pool.query(
        "SELECT COUNT(*) as count FROM shipments WHERE id IN (?) AND region_id IS NOT NULL AND region_id != ?",
        [shipment_ids, currentUser.region_id]
      );

      if (invalidShipments[0].count > 0) {
        return res.status(403).json({
          message: "Có đơn hàng không thuộc khu vực quản lý của bạn!",
        });
      }
    } catch (error) {
      return res.status(500).json({ message: "Lỗi kiểm tra quyền hạn khu vực" });
    }
  }




  const connection = await pool.getConnection();
  try {
    await connection.beginTransaction();

    const values = shipment_ids.map((id) => [
      id,
      driver_id,
      "assigned",
      new Date(),
    ]);
    await connection.query(
      `INSERT INTO assignments (shipment_id, driver_id, status, assigned_at) VALUES ?`,
      [values],
    );

    await connection.query(
      `UPDATE shipments SET status = 'assigned', updated_at = NOW() WHERE id IN (?)`,
      [shipment_ids],
    );

    await connection.commit();


    sendNotificationToDriver(
      driver_id,
      null,
      `Bạn vừa được phân công ${shipment_ids.length} đơn hàng mới!`,
    ).catch(() => {});


    try {
      const [shipments] = await connection.query(
        "SELECT id, customer_id, tracking_code FROM shipments WHERE id IN (?)",
        [shipment_ids]
      );

      for (const ship of shipments) {
        if (ship.customer_id) {
          await sendNotificationToCustomer(
            ship.customer_id,
            ship.id,
            `🚚 Đơn hàng #${ship.tracking_code} đã được phân công cho tài xế và đang chờ đi lấy!`
          );
        }
      }
    } catch (e) {
    }

    res.json({
      message: `Đã phân công thành công ${shipment_ids.length} đơn hàng!`,
    });
  } catch (err) {
    await connection.rollback();
    res
      .status(500)
      .json({ message: "Lỗi hệ thống khi phân công: " + err.message });
  } finally {
    connection.release();
  }
};
