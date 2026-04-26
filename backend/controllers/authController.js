import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import pool from "../config/db.js";
import { sendMail } from "../utils/sendMail.js";


// Đăng ký tài khoản mới
export const register = async (req, res) => {
  const { name, email, password, phone } = req.body;
  if (!name || !email || !password)
    return res.status(400).json({ message: "Vui lòng nhập đầy đủ thông tin!" });

  try {
    const [exist] = await pool.query("SELECT * FROM users WHERE email = ?", [
      email,
    ]);
    if (exist.length)
      return res.status(400).json({ message: "Email đã tồn tại" });

    const hash = await bcrypt.hash(password, 10);


    const [result] = await pool.query(
      "INSERT INTO users (name,email,password,phone) VALUES (?,?,?,?)",
      [name, email, hash, phone]
    );


    const [role] = await pool.query(
      "SELECT id FROM roles WHERE code='customer'"
    );
    if (role.length)
      await pool.query("INSERT INTO user_roles(user_id,role_id) VALUES(?,?)", [
        result.insertId,
        role[0].id,
      ]);

    res.json({ message: "Đăng ký thành công" });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};


// Đăng nhập tài khoản
export const login = async (req, res) => {
  const { email, password } = req.body;
  if (!email || !password)
    return res.status(400).json({ message: "Vui lòng nhập đầy đủ thông tin!" });

  try {

    const [users] = await pool.query("SELECT * FROM users WHERE email = ?", [
      email,
    ]);
    if (!users.length)
      return res.status(401).json({ message: "Sai tài khoản hoặc mật khẩu" });

    const user = users[0];


    if (user.status && user.status.toLowerCase() === "inactive") {
      return res.status(403).json({
        message:
          "Tài khoản của bạn đã bị vô hiệu hóa, vui lòng liên hệ quản trị viên.",
      });
    }


    const match = await bcrypt.compare(password, user.password);
    if (!match) {
      return res.status(401).json({ message: "Sai tài khoản hoặc mật khẩu" });
    }


    const [roles] = await pool.query(
      `SELECT r.code FROM roles r JOIN user_roles ur ON ur.role_id = r.id WHERE ur.user_id = ?`,
      [user.id]
    );

    const role = roles[0]?.code || "customer";


    const token = jwt.sign(
      {
        id: user.id,
        role: role,
        region_id: user.region_id,
      },
      process.env.JWT_SECRET || "secret-key",
      { expiresIn: "1d" }
    );


    res.json({
      message: "Đăng nhập thành công",
      token,
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        role: role,
        region_id: user.region_id,
      },
    });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};


export const sendOtp = async (req, res) => {
  const { email } = req.body;
  if (!email) return res.status(400).json({ message: "Thiếu email" });

  try {

    const [exist] = await pool.query("SELECT * FROM users WHERE email = ?", [
      email,
    ]);
    if (exist.length) {
      return res.status(400).json({ message: "Email này đã được sử dụng!" });
    }


    const otp = Math.floor(100000 + Math.random() * 900000);
    const expiresAt = Date.now() + 5 * 60 * 1000;


    await pool.query(
      "INSERT INTO otp_codes (email, code, expires_at) VALUES (?, ?, ?)",
      [email, otp, expiresAt]
    );


    await sendMail(
      email,
      "SpeedyShip - Xác thực tài khoản",
      `
  <div style="font-family:Arial,sans-serif;max-width:480px;margin:auto;border:1px solid #e5e5e5;border-radius:10px;overflow:hidden;">
    <div style="background:#1e90ff;padding:16px 24px;text-align:center;color:#fff;font-size:20px;font-weight:700;">
      Xác thực tài khoản SpeedyShip
    </div>
    <div style="padding:24px 30px;color:#333;font-size:15px;line-height:1.6;">
      <p>Xin chào,</p>
      <p>Bạn đang yêu cầu kích hoạt tài khoản SpeedyShip. Mã OTP xác thực của bạn là:</p>
      <div style="font-size:36px;font-weight:700;color:#1e90ff;text-align:center;margin:20px 0;">
        ${otp}
      </div>
      <p>Mã OTP có hiệu lực <strong>5 phút</strong>. Vui lòng không chia sẻ mã với bất kỳ ai.</p>
      <hr style="border:none;border-top:1px solid #ddd;margin:24px 0;">
      <p style="font-size:12px;color:#777;text-align:center;">
        Nếu bạn không yêu cầu OTP, hãy bỏ qua email này.
      </p>
    </div>
  </div>
  `
    );

    res.json({ message: "Đã gửi mã OTP đến email của bạn." });
  } catch (err) {
    res.status(500).json({ message: "Gửi OTP thất bại." });
  }
};


export const verifyOtp = async (req, res) => {
  const { email, otp } = req.body;

  try {
    const [rows] = await pool.query(
      "SELECT * FROM otp_codes WHERE email=? ORDER BY id DESC LIMIT 1",
      [email]
    );

    if (!rows.length)
      return res.status(400).json({ message: "Không tìm thấy mã OTP!" });

    const record = rows[0];
    if (Date.now() > record.expires_at)
      return res.status(400).json({ message: "Mã OTP đã hết hạn!" });

    if (record.code !== otp)
      return res.status(400).json({ message: "Mã OTP không đúng!" });

    res.json({ message: "Xác thực OTP thành công!" });
  } catch (err) {
    res.status(500).json({ message: "Lỗi xác thực OTP." });
  }
};
