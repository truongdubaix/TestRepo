import db from "../config/db.js";
import {
  sendNotificationToDriver,
  sendNotificationToCustomer,
} from "../server.js";


// Lấy danh sách đơn chưa phân công
export const getUnassignedShipments = async (req, res) => {
  try {
    const { region_id } = req.user;

    let sql = `
      SELECT s.*
      FROM shipments s
      LEFT JOIN assignments a 
        ON a.shipment_id = s.id 
        AND a.status IN ('assigned','picking','delivering')
      WHERE a.id IS NULL 
        AND s.status IN ('pending','assigned','picking','delivering')
    `;

    const params = [];


    if (region_id) {
      sql += " AND s.region_id = ?";
      params.push(region_id);
    }

    sql += " ORDER BY s.created_at DESC";

    const [rows] = await db.query(sql, params);
    res.json(rows);
  } catch (err) {
    res.status(500).json({ message: "Lỗi server khi lấy đơn chưa phân công" });
  }
};


export const getAvailableDrivers = async (req, res) => {
  try {
    const { region_id } = req.user;

    let sql = `
      SELECT id, name, email, phone, status, vehicle_type, region_id
      FROM drivers
      WHERE status <> 'inactive'
    `;

    const params = [];


    if (region_id) {
      sql += " AND region_id = ?";
      params.push(region_id);
    }

    sql += " ORDER BY name ASC";

    const [rows] = await db.query(sql, params);
    res.json(rows);
  } catch (err) {
    res.status(500).json({ message: "Lỗi server khi lấy tài xế" });
  }
};


// Phân công đơn hàng cho tài xế
export const assignShipment = async (req, res) => {
  try {
    const { shipment_id, driver_id } = req.body;
    const { region_id } = req.user;

    if (!shipment_id || !driver_id)
      return res
        .status(400)
        .json({ message: "Thiếu shipment_id hoặc driver_id" });


    if (region_id) {
      const [driverCheck] = await db.query(
        "SELECT id FROM drivers WHERE id = ? AND region_id = ?",
        [driver_id, region_id]
      );
      if (driverCheck.length === 0) {
        return res
          .status(403)
          .json({ message: "Tài xế không thuộc khu vực quản lý của bạn!" });
      }
    }

    await db.query(
      `INSERT INTO assignments (driver_id, shipment_id, status, assigned_at)
       VALUES (?, ?, 'assigned', NOW())`,
      [driver_id, shipment_id]
    );

    await db.query(
      `UPDATE shipments SET status='assigned', updated_at=NOW() WHERE id=?`,
      [shipment_id]
    );


    await db.query(`UPDATE drivers SET status='delivering' WHERE id=?`, [
      driver_id,
    ]);


    try {
      const [[shipmentInfo]] = await db.query(
        "SELECT service_type, tracking_code FROM shipments WHERE id = ?",
        [shipment_id]
      );

      const isExpress = shipmentInfo?.service_type === 'fast';
      const msg = isExpress
        ? `Don hoa toc #${shipmentInfo.tracking_code} - Giao NGAY!`
        : `Don hang #${shipmentInfo?.tracking_code || shipment_id} da duoc phan cong cho ban`;

      await sendNotificationToDriver(driver_id, shipment_id, msg, {
        service_type: shipmentInfo?.service_type || 'normal',
        tracking_code: shipmentInfo?.tracking_code || '',
      });
    } catch (e) {
    }


    try {
      const [[shipment]] = await db.query(
        "SELECT customer_id, tracking_code FROM shipments WHERE id = ?",
        [shipment_id]
      );
      if (shipment && shipment.customer_id) {
        await sendNotificationToCustomer(
          shipment.customer_id,
          shipment_id,
          `🚚 Đơn hàng #${shipment.tracking_code} đã được phân công cho tài xế và đang chờ lấy hàng!`
        );
      }
    } catch (e) {
    }

    res.json({ message: "✅ Đã phân công tài xế cho đơn hàng" });
  } catch (err) {
    res.status(500).json({ message: "Lỗi server khi phân công đơn" });
  }
};


// Lấy danh sách phân công
export const getAssignments = async (req, res) => {
  try {
    const { region_id } = req.user;
    const activeOnly = String(req.query.activeOnly || "false") === "true";

    let sql = `
      SELECT 
        a.id,
        a.shipment_id,
        a.driver_id,
        a.status AS assignment_status,
        a.assigned_at,
        s.tracking_code,
        s.status AS shipment_status,
        s.current_location,
        s.pickup_address,
        s.delivery_address,
        s.region_id,
        d.name AS driver_name,
        d.phone AS driver_phone,
        d.vehicle_type
      FROM assignments a
      JOIN shipments s ON s.id = a.shipment_id
      JOIN drivers d ON d.id = a.driver_id
      WHERE 1=1
    `;

    const params = [];


    if (activeOnly) {
      sql += ` AND a.status IN ('assigned','picking','delivering')`;
    }


    if (region_id) {
      sql += ` AND s.region_id = ?`;
      params.push(region_id);
    }

    sql += ` ORDER BY a.assigned_at DESC`;

    const [rows] = await db.query(sql, params);
    res.json(rows);
  } catch (err) {
    res.status(500).json({ message: "Lỗi server khi lấy danh sách phân công" });
  }
};


// Cập nhật trạng thái phân công
export const updateAssignmentStatus = async (req, res) => {
  try {
    const { id } = req.params;
    const { status, current_location } = req.body;

    if (!status) return res.status(400).json({ message: "Thiếu status" });

    await db.query(`UPDATE assignments SET status=? WHERE id=?`, [status, id]);

    const [[row]] = await db.query(
      `SELECT shipment_id, driver_id FROM assignments WHERE id=?`,
      [id]
    );
    if (!row)
      return res.status(404).json({ message: "Không tìm thấy assignment" });

    let shipmentStatus;
    switch (status) {
      case "assigned":
        shipmentStatus = "assigned";
        break;
      case "picking":
        shipmentStatus = "picking";
        break;
      case "delivering":
        shipmentStatus = "delivering";
        break;
      case "completed":
        shipmentStatus = "delivered";
        break;
      case "failed":
        shipmentStatus = "failed";
        break;
    }


    const shipmentQuery = current_location
      ? `UPDATE shipments SET status=?, current_location=?, updated_at=NOW() WHERE id=?`
      : `UPDATE shipments SET status=?, updated_at=NOW() WHERE id=?`;

    await db.query(
      shipmentQuery,
      current_location
        ? [shipmentStatus, current_location, row.shipment_id]
        : [shipmentStatus, row.shipment_id]
    );


    if (status === "completed" || status === "failed") {

      await db.query(`UPDATE drivers SET status='free' WHERE id=?`, [
        row.driver_id,
      ]);
    }


    try {
      const [[shipment]] = await db.query(
        "SELECT customer_id, tracking_code FROM shipments WHERE id = ?",
        [row.shipment_id]
      );
      if (shipment && shipment.customer_id) {
        let msg = `Đơn hàng #${shipment.tracking_code} đã được cập nhật trạng thái mới.`;
        if (shipmentStatus === 'picking') msg = `Tài xế đang trên đường đến lấy đơn hàng #${shipment.tracking_code}.`;
        else if (shipmentStatus === 'delivering') msg = `Đơn hàng #${shipment.tracking_code} đang được giao đến bạn.`;
        else if (shipmentStatus === 'delivered') msg = `✅ Đơn hàng #${shipment.tracking_code} đã được giao thành công!`;
        else if (shipmentStatus === 'failed') msg = `❌ Đơn hàng #${shipment.tracking_code} giao/lấy thất bại.`;

        await sendNotificationToCustomer(shipment.customer_id, row.shipment_id, msg);
      }
    } catch (e) {
    }

    res.json({ message: "✅ Đã cập nhật trạng thái và đồng bộ tài xế" });
  } catch (err) {
    res.status(500).json({ message: "Lỗi server khi cập nhật trạng thái" });
  }
};


// Lấy dữ liệu dashboard điều phối viên
export const getDispatcherDashboard = async (req, res) => {
  try {
    const { region_id } = req.user;
    let regionConditionShipment = "";
    let regionConditionDriver = "";
    let regionConditionTopDriver = "";
    const params = [];

    if (region_id) {
      regionConditionShipment = "WHERE region_id = ?";
      regionConditionDriver = "WHERE region_id = ?";
      regionConditionTopDriver = "WHERE d.region_id = ?";
    }


    const [shipmentStats] = await db.query(
      `
      SELECT LOWER(TRIM(status)) AS status, COUNT(*) AS count
      FROM shipments
      ${regionConditionShipment}
      GROUP BY LOWER(TRIM(status))
    `,
      region_id ? [region_id] : []
    );


    const [driverStats] = await db.query(
      `
      SELECT LOWER(TRIM(status)) AS status, COUNT(*) AS count
      FROM drivers
      ${regionConditionDriver}
      GROUP BY LOWER(TRIM(status))
    `,
      region_id ? [region_id] : []
    );


    const [topDrivers] = await db.query(
      `
      SELECT d.name, COUNT(a.id) AS deliveries
      FROM drivers d
      LEFT JOIN assignments a ON d.id = a.driver_id
      ${regionConditionTopDriver}
      GROUP BY d.id, d.name
      ORDER BY deliveries DESC
      LIMIT 5
    `,
      region_id ? [region_id] : []
    );


    const [revenueData] = await db.query(
      `
      SELECT MONTH(created_at) AS monthNo, SUM(shipping_fee) AS total
      FROM shipments
      WHERE YEAR(created_at) = YEAR(CURDATE()) 
        AND status = 'delivered'
        ${regionConditionShipment ? "AND " + regionConditionShipment.replace("WHERE ", "") : ""}
      GROUP BY MONTH(created_at)
      ORDER BY MONTH(created_at)
    `,
      region_id ? [region_id] : []
    );

    const monthNames = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
    const revenue = monthNames.map((name, index) => ({ month: name, total: 0 }));

    revenueData.forEach((row) => {

      if (row.monthNo >= 1 && row.monthNo <= 12) {
        revenue[row.monthNo - 1].total = Number(row.total || 0);
      }
    });

    res.json({
      shipments: shipmentStats,
      drivers: driverStats,
      topDrivers,
      revenue,
    });
  } catch (err) {
    res.status(500).json({ message: "Lỗi server khi lấy dữ liệu dashboard" });
  }
};


export const reassignDriver = async (req, res) => {

  try {
    const { id } = req.params;
    const { driver_id } = req.body;

    await db.query(`UPDATE assignments SET driver_id=? WHERE id=?`, [
      driver_id,
      id,
    ]);
    res.json({ message: "✅ Đã đổi tài xế" });
  } catch (err) {
    res.status(500).json({ message: "Lỗi" });
  }
};

export const getShipmentDetail = async (req, res) => {

  try {
    const { id } = req.params;
    const [[shipment]] = await db.query(
      `SELECT s.*, d.name AS driver_name, d.latitude, d.longitude
           FROM shipments s
           LEFT JOIN assignments a ON a.shipment_id = s.id
           LEFT JOIN drivers d ON d.id = a.driver_id
           WHERE s.id = ?`,
      [id]
    );
    res.json(shipment || {});
  } catch (err) {
    res.status(500).json({ message: "Lỗi" });
  }
};


// Tìm tài xế gần nhất theo vị trí
export const getNearbyDrivers = async (req, res) => {
  try {
    const { shipment_id } = req.query;
    const { region_id } = req.user;

    if (!shipment_id) {
      return res.status(400).json({ message: "Thiếu shipment_id" });
    }


    const [[shipment]] = await db.query(
      `SELECT id, delivery_lat, delivery_lng, delivery_address, pickup_lat, pickup_lng, region_id
       FROM shipments WHERE id = ?`,
      [shipment_id]
    );

    if (!shipment) {
      return res.status(404).json({ message: "Không tìm thấy đơn hàng" });
    }


    let targetLat = parseFloat(shipment.delivery_lat) || parseFloat(shipment.pickup_lat);
    let targetLng = parseFloat(shipment.delivery_lng) || parseFloat(shipment.pickup_lng);


    if (!targetLat || !targetLng) {
      const address = shipment.delivery_address;
      if (address) {
        try {
          const encodedAddr = encodeURIComponent(address);
          const geoRes = await fetch(
            `https://nominatim.openstreetmap.org/search?q=${encodedAddr}&format=json&limit=1`,
            { headers: { "User-Agent": "SpeedyShip-Dispatcher/1.0" } }
          );
          const geoData = await geoRes.json();
          if (geoData?.length > 0) {
            targetLat = parseFloat(geoData[0].lat);
            targetLng = parseFloat(geoData[0].lon);

            await db.query(
              "UPDATE shipments SET delivery_lat = ?, delivery_lng = ? WHERE id = ?",
              [targetLat, targetLng, shipment_id]
            );
          }
        } catch (geoErr) {
        }
      }
    }


    if (!targetLat || !targetLng) {
      let fallbackSql = `
        SELECT id, name, phone, status, vehicle_type, latitude, longitude
        FROM drivers WHERE status IN ('available', 'free')
      `;
      const fallbackParams = [];
      const shipRegion = shipment.region_id || region_id;
      if (shipRegion) {
        fallbackSql += " AND region_id = ?";
        fallbackParams.push(shipRegion);
      }
      fallbackSql += " ORDER BY name ASC LIMIT 10";
      const [rows] = await db.query(fallbackSql, fallbackParams);
      return res.json(rows.map((d) => ({ ...d, distance_km: null })));
    }


    let sql = `
      SELECT 
        d.id, d.name, d.phone, d.status, d.vehicle_type,
        d.latitude, d.longitude, d.region_id,
        ROUND(
          6371 * ACOS(
            LEAST(1, GREATEST(-1,
              COS(RADIANS(?)) * COS(RADIANS(d.latitude)) *
              COS(RADIANS(d.longitude) - RADIANS(?)) +
              SIN(RADIANS(?)) * SIN(RADIANS(d.latitude))
            ))
          ), 2
        ) AS distance_km
      FROM drivers d
      WHERE d.status IN ('available', 'free')
        AND d.latitude IS NOT NULL
        AND d.longitude IS NOT NULL
        AND d.latitude != 0 AND d.longitude != 0
    `;

    const params = [targetLat, targetLng, targetLat];


    const shipRegion = shipment.region_id || region_id;
    if (shipRegion) {
      sql += " AND d.region_id = ?";
      params.push(shipRegion);
    }

    sql += " ORDER BY distance_km ASC LIMIT 10";

    const [rows] = await db.query(sql, params);


    if (rows.length === 0) {
      const [allRows] = await db.query(
        `SELECT d.id, d.name, d.phone, d.status, d.vehicle_type,
          d.latitude, d.longitude, d.region_id,
          ROUND(6371 * ACOS(LEAST(1, GREATEST(-1,
            COS(RADIANS(?)) * COS(RADIANS(d.latitude)) *
            COS(RADIANS(d.longitude) - RADIANS(?)) +
            SIN(RADIANS(?)) * SIN(RADIANS(d.latitude))
          ))), 2) AS distance_km
         FROM drivers d
         WHERE d.status IN ('available', 'free')
           AND d.latitude IS NOT NULL AND d.longitude IS NOT NULL
           AND d.latitude != 0 AND d.longitude != 0
         ORDER BY distance_km ASC LIMIT 10`,
        [targetLat, targetLng, targetLat]
      );
      return res.json(allRows);
    }

    res.json(rows);
  } catch (err) {
    res.status(500).json({ message: "Lỗi server khi tìm tài xế gần nhất" });
  }
};




// Lấy danh sách đơn giao thất bại
export const getFailedShipments = async (req, res) => {
  try {
    const region_id = req.user?.region_id || null;


    let sql = `
      SELECT
        s.id,
        s.tracking_code,
        s.receiver_name,
        s.receiver_phone,
        s.delivery_address,
        s.pickup_address,
        s.service_type,
        s.status,
        s.updated_at AS failed_at,
        COALESCE(s.failure_note, '') AS failure_note,
        COALESCE(s.fail_count, 0) AS fail_count,
        s.scheduled_date,
        (
          SELECT d.name FROM assignments a2
          JOIN drivers d ON d.id = a2.driver_id
          WHERE a2.shipment_id = s.id
          ORDER BY a2.assigned_at DESC LIMIT 1
        ) AS driver_name,
        (
          SELECT d.phone FROM assignments a2
          JOIN drivers d ON d.id = a2.driver_id
          WHERE a2.shipment_id = s.id
          ORDER BY a2.assigned_at DESC LIMIT 1
        ) AS driver_phone,
        (
          SELECT COUNT(*) FROM assignments a3
          WHERE a3.shipment_id = s.id AND a3.status = 'failed'
        ) AS total_fails
      FROM shipments s
      WHERE s.status = 'failed'
    `;

    const params = [];
    if (region_id) {
      sql += " AND s.region_id = ?";
      params.push(region_id);
    }
    sql += " ORDER BY s.updated_at DESC";

    const [rows] = await db.query(sql, params);
    res.json(rows);
  } catch (err) {
    res.status(500).json({ message: "Lỗi khi lấy danh sách đơn thất bại: " + err.message });
  }
};


export const rescheduleShipment = async (req, res) => {
  try {
    const { id } = req.params;
    const { scheduled_date, driver_id } = req.body;


    const targetDate = scheduled_date
      ? new Date(scheduled_date)
      : (() => { const d = new Date(); d.setDate(d.getDate() + 1); return d; })();

    const dateStr = targetDate.toISOString().split('T')[0];


    await db.query(
      `UPDATE shipments
       SET status = 'pending',
           scheduled_date = ?,
           fail_count = COALESCE(fail_count, 0) + 1,
           updated_at = NOW()
       WHERE id = ?`,
      [dateStr, id]
    );


    await db.query(
      `UPDATE assignments SET status = 'failed' WHERE shipment_id = ? AND status IN ('assigned','picking','delivering','failed')`,
      [id]
    );


    if (driver_id) {
      await db.query(
        `INSERT INTO assignments (driver_id, shipment_id, status, assigned_at)
         VALUES (?, ?, 'assigned', NOW())`,
        [driver_id, id]
      );
      await db.query(`UPDATE drivers SET status='delivering' WHERE id=?`, [driver_id]);
      await db.query(`UPDATE shipments SET status='assigned' WHERE id=?`, [id]);
    }

    res.json({ message: `Da lich giao lai vao ngay ${dateStr}` });
  } catch (err) {
    res.status(500).json({ message: "Loi khi giao lai don hang" });
  }
};


export const cancelFailedShipment = async (req, res) => {
  try {
    const { id } = req.params;

    const [[shipment]] = await db.query(
      "SELECT fail_count, status, tracking_code, customer_id FROM shipments WHERE id = ?",
      [id]
    );

    if (!shipment) return res.status(404).json({ message: "Không tìm thấy đơn hàng" });
    if (shipment.status !== 'failed') {
      return res.status(400).json({ message: "Chỉ được hủy đơn ở trạng thái thất bại" });
    }

    const failCount = shipment.fail_count || 0;

    await db.query(
      "UPDATE shipments SET status = 'canceled', updated_at = NOW() WHERE id = ?",
      [id]
    );
    await db.query(
      "UPDATE assignments SET status = 'failed' WHERE shipment_id = ?",
      [id]
    );


    try {
      if (shipment.customer_id) {
        await sendNotificationToCustomer(
          shipment.customer_id, id,
          `Đơn hàng #${shipment.tracking_code} đã bị hủy do giao thất bại ${failCount} lần.`
        );
      }
    } catch (_) {}

    res.json({ message: `Đã hủy đơn hàng #${shipment.tracking_code}` });
  } catch (err) {
    res.status(500).json({ message: "Lỗi khi hủy đơn: " + err.message });
  }
};

