import pool from "../config/db.js";
import bcrypt from "bcryptjs";


export const getCustomerProfile = async (req, res) => {
  try {
    const userId = req.params.id;


    const sql = `
      SELECT 
        u.id, u.name, u.email, u.phone, u.avatar, u.address,
        COALESCE(w.balance, 0) AS wallet_balance,
        (SELECT COUNT(*) FROM shipments WHERE customer_id = u.id) AS total_orders,
        (SELECT COALESCE(SUM(amount), 0) FROM payments WHERE customer_id = u.id AND status = 'completed') AS total_spent
      FROM users u
      LEFT JOIN wallets w ON u.id = w.user_id
      WHERE u.id = ? AND u.role = 'customer'
    `;

    const [rows] = await pool.query(sql, [userId]);

    if (rows.length === 0) {
      return res.status(404).json({ message: "Không tìm thấy khách hàng" });
    }

    const user = rows[0];


    let rank = "Thành viên mới";
    const spent = Number(user.total_spent);

    if (spent >= 20000000) rank = "💎 Kim Cương";
    else if (spent >= 10000000) rank = "🏆 Vàng";
    else if (spent >= 2000000) rank = "🥈 Bạc";
    else if (spent > 0) rank = "🥉 Đồng";


    res.json({
      ...user,
      rank: rank,
      wallet_balance: Number(user.wallet_balance),
      total_spent: spent,
    });
  } catch (err) {
    res.status(500).json({ message: "Lỗi hệ thống" });
  }
};


export const updateCustomerProfile = async (req, res) => {
  const { name, email, phone, address, avatar } = req.body;
  const userId = req.params.id;

  try {

    await pool.query(
      `UPDATE users 
       SET name = ?, phone = ?, address = ?, avatar = ? 
       WHERE id = ? AND role = 'customer'`,
      [name, phone, address, avatar, userId]
    );

    res.json({ message: "Cập nhật hồ sơ thành công!" });
  } catch (err) {
    res.status(500).json({ message: "Không thể cập nhật hồ sơ" });
  }
};


// Tạo đơn hàng mới
export const createShipment = async (req, res) => {
  const {
    customer_id,
    sender_name,
    sender_phone,
    receiver_name,
    receiver_phone,
    item_name,
    pickup_address,
    delivery_address,
    weight_kg,
    cod_amount,
    shipping_fee,
    service_type,
    payment_method = "COD",
  } = req.body;

  try {

    const tracking = `SP${Date.now().toString().slice(-6)}`;

    const [result] = await pool.query(
      `INSERT INTO shipments(
    tracking_code,
    customer_id,
    sender_name, sender_phone,
    receiver_name, receiver_phone,
    item_name,
    pickup_address, pickup_lat, pickup_lng,
    delivery_address, delivery_lat, delivery_lng,
    weight_kg,
    cod_amount,
    shipping_fee,
    service_type,
    payment_method,
    status
  )
  VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?, 'pending')`,
      [
        tracking,
        customer_id,
        sender_name,
        sender_phone,
        receiver_name,
        receiver_phone,
        item_name,
        pickup_address,
        pickup_lat,
        pickup_lng,
        delivery_address,
        delivery_lat,
        delivery_lng,
        weight_kg,
        cod_amount,
        shipping_fee,
        service_type,
        payment_method,
      ]
    );

    const shipment_id = result.insertId;


    if (payment_method === "MOMO") {
      await pool.query(
        `INSERT INTO payments (shipment_id, customer_id, amount, method, status)
         VALUES (?, ?, ?, ?, 'pending')`,
        [shipment_id, customer_id, cod_amount + shipping_fee, payment_method]
      );
    }

    res.json({
      message: "Tạo đơn hàng thành công",
      shipment_id,
      tracking_code: tracking,
    });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};


// Lấy đơn hàng của khách hàng
export const getShipmentsByCustomer = async (req, res) => {
  try {
    const [rows] = await pool.query(
      "SELECT * FROM shipments WHERE customer_id = ? ORDER BY created_at DESC",
      [req.params.customer_id]
    );
    res.json(rows);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};


// Gửi đánh giá/phản hồi
export const createFeedback = async (req, res) => {
  const { customer_id, shipment_id, content, rating } = req.body;
  try {
    await pool.query(
      "INSERT INTO feedbacks (customer_id, shipment_id, content, rating, created_at) VALUES (?,?,?,?,NOW())",
      [customer_id, shipment_id, content, rating]
    );
    res.json({ message: "Feedback submitted successfully" });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};


export const trackShipment = async (req, res) => {
  try {
    const { code } = req.params;
    const customerId = req.query.customer_id || null;
    const last4 = req.query.last4 || null;

    if (!code) {
      return res.status(400).json({ message: "Thiếu mã vận đơn!" });
    }

    let query = `
  SELECT 
    s.*, 
    d.name AS driver_name, 
    d.phone AS driver_phone,
    d.license_no AS plate_number, 
    d.latitude AS driver_lat, 
    d.longitude AS driver_lng
  FROM shipments s
  LEFT JOIN assignments a ON a.shipment_id = s.id
  LEFT JOIN drivers d ON a.driver_id = d.id
  WHERE s.tracking_code = ?
`;
    const params = [code];


    if (customerId) {
      query += " AND s.customer_id = ?";
      params.push(customerId);
    }

    else if (last4) {
      query +=
        " AND RIGHT(REGEXP_REPLACE(s.receiver_phone, '[^0-9]', ''), 4) = ?";
      params.push(last4);
    } else {
      return res.status(400).json({
        message: "Khách vãng lai phải nhập 4 số cuối SĐT người nhận!",
      });
    }

    const [rows] = await pool.query(query, params);

    if (!rows.length) {
      return res.status(404).json({
        message: "Không tìm thấy đơn hàng hoặc thông tin xác thực không đúng!",
      });
    }

    const shipment = rows[0];

    res.json(shipment);
  } catch (err) {
    res.status(500).json({ message: "Lỗi máy chủ!" });
  }
};

export const getShipmentDetail = async (req, res) => {
  try {
    const [rows] = await pool.query(
      `SELECT 
          s.*, 
          d.name AS driver_name,
          d.latitude AS driver_lat,
          d.longitude AS driver_lng
        FROM shipments s
        LEFT JOIN assignments a ON a.shipment_id = s.id
        LEFT JOIN drivers d ON a.driver_id = d.id
        WHERE s.id = ?`,
      [req.params.id]
    );

    if (!rows.length)
      return res.status(404).json({ message: "Không tìm thấy đơn hàng" });

    res.json(rows[0]);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};


// Đổi mật khẩu
export const changePassword = async (req, res) => {
  const { id } = req.params;
  const { currentPassword, newPassword } = req.body;

  try {

    if (!currentPassword || !newPassword) {
      return res.status(400).json({ error: "Vui lòng nhập đầy đủ thông tin" });
    }

    if (newPassword.length < 6) {
      return res
        .status(400)
        .json({ error: "Mật khẩu mới phải có ít nhất 6 ký tự" });
    }


    const [users] = await pool.query("SELECT * FROM users WHERE id = ?", [id]);

    if (users.length === 0) {
      return res.status(404).json({ error: "Người dùng không tồn tại" });
    }

    const user = users[0];


    const isMatch = await bcrypt.compare(currentPassword, user.password);

    if (!isMatch) {
      return res
        .status(400)
        .json({ error: "Mật khẩu hiện tại không chính xác!" });
    }


    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(newPassword, salt);


    await pool.query("UPDATE users SET password = ? WHERE id = ?", [
      hashedPassword,
      id,
    ]);

    res.status(200).json({ message: "Đổi mật khẩu thành công!" });
  } catch (err) {
    res.status(500).json({ error: "Lỗi hệ thống, vui lòng thử lại sau." });
  }
};
