import pool from "../config/db.js";
import nodemailer from "nodemailer";
import bcrypt from "bcrypt";

const transporter = nodemailer.createTransport({
  service: "gmail",
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS,
  },
});

// Đăng ký trở thành tài xế
export const applyDriver = async (req, res) => {
  try {
    const { name, phone, email, license_plate, vehicle_type, experience } = req.body;

    if (!name || !phone || !email || !license_plate) {
      return res.status(400).json({ error: "Vui lòng nhập đầy đủ thông tin bắt buộc!" });
    }

    await pool.query(
      `INSERT INTO driver_applications 
       (name, phone, email, license_plate, vehicle_type, experience)
       VALUES (?, ?, ?, ?, ?, ?)`,
      [name, phone, email, license_plate, vehicle_type || "", experience || ""]
    );

    // Gửi email xác nhận — không block nếu email lỗi
    try {
      await transporter.sendMail({
        from: `"SpeedyShip" <${process.env.EMAIL_USER}>`,
        to: email,
        subject: "SpeedyShip - Xác nhận nhận hồ sơ tài xế",
        html: `
          <h2>Xin chào ${name},</h2>
          <p>Cảm ơn bạn đã gửi đơn ứng tuyển làm tài xế cho SpeedyShip.</p>
          <p>Chúng tôi sẽ xem xét hồ sơ và liên hệ với bạn trong thời gian sớm nhất.</p>
          <p>Trân trọng,<br>Đội ngũ SpeedyShip</p>
        `,
      });
    } catch (_mailErr) {
      // Email lỗi không ảnh hưởng đến kết quả lưu hồ sơ
    }

    res.json({ message: "Nộp đơn thành công! Chúng tôi sẽ liên hệ sớm." });
  } catch (err) {
    res.status(500).json({ error: "Lỗi server: " + err.message });
  }
};

// Lấy danh sách đơn đăng ký tài xế
export const getApplications = async (_req, res) => {
  try {
    const [rows] = await pool.query(
      "SELECT * FROM driver_applications ORDER BY created_at DESC"
    );
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: "Lỗi server: " + err.message });
  }
};

// Duyệt đơn đăng ký tài xế
export const approveApplication = async (req, res) => {
  const { id } = req.params;

  try {
    const [[app]] = await pool.query(
      "SELECT * FROM driver_applications WHERE id = ?",
      [id]
    );

    if (!app) {
      return res.status(404).json({ error: "Không tìm thấy hồ sơ!" });
    }

    const [[existingUser]] = await pool.query(
      "SELECT id FROM users WHERE email = ?",
      [app.email]
    );

    let userId;
    const plainPassword = "123456";

    if (existingUser) {
      userId = existingUser.id;
    } else {
      const hashed = await bcrypt.hash(plainPassword, 10);
      const [userRes] = await pool.query(
        `INSERT INTO users (name, email, password, role)
         VALUES (?, ?, ?, 'driver')`,
        [app.name, app.email, hashed]
      );
      userId = userRes.insertId;
    }

    const [driverRes] = await pool.query(
      `INSERT INTO drivers (user_id, name, phone, email, license_no, vehicle_type, status)
       VALUES (?, ?, ?, ?, ?, ?, 'free')`,
      [userId, app.name, app.phone, app.email, app.license_plate, app.vehicle_type]
    );

    const driverId = driverRes.insertId;

    const [vehicleRes] = await pool.query(
      `INSERT INTO vehicles (plate_no, type, capacity_kg, driver_id, status)
       VALUES (?, ?, ?, ?, 'available')`,
      [app.license_plate, app.vehicle_type, 150, driverId]
    );

    await pool.query(
      "UPDATE driver_applications SET status='approved' WHERE id = ?",
      [id]
    );

    // Gửi email thông báo duyệt
    try {
      await transporter.sendMail({
        from: `"SpeedyShip" <${process.env.EMAIL_USER}>`,
        to: app.email,
        subject: "Tài khoản tài xế SpeedyShip của bạn",
        html: `
          <h2>Xin chúc mừng ${app.name}!</h2>
          <p>Hồ sơ của bạn đã được <strong>duyệt</strong>.</p>
          <p>Bạn có thể đăng nhập vào hệ thống SpeedyShip với thông tin:</p>
          <ul>
            <li><strong>Email:</strong> ${app.email}</li>
            <li><strong>Mật khẩu:</strong> 123456</li>
          </ul>
          <p>Vui lòng đăng nhập và đổi mật khẩu của bạn sớm nhất.</p>
          <br>
          <p>Chúc bạn làm việc hiệu quả!</p>
        `,
      });
    } catch (_mailErr) {
      // Email lỗi không ảnh hưởng đến kết quả duyệt
    }

    res.json({
      message: "Duyệt thành công! Tài xế + Xe đã được tạo & email đã gửi.",
      driverId,
      vehicleId: vehicleRes.insertId,
    });
  } catch (err) {
    res.status(500).json({ error: "Lỗi server: " + err.message });
  }
};

// Từ chối đơn đăng ký tài xế
export const rejectApplication = async (req, res) => {
  try {
    await pool.query(
      "UPDATE driver_applications SET status='rejected' WHERE id=?",
      [req.params.id]
    );
    res.json({ message: "Đã từ chối hồ sơ." });
  } catch (err) {
    res.status(500).json({ error: "Lỗi server: " + err.message });
  }
};
