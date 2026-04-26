import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import pool from "../config/db.js";
import { sendMail } from "../utils/sendMail.js";

// Quên mật khẩu - gửi email reset
export const forgotPassword = async (req, res) => {
  const { email } = req.body;
  if (!email) return res.status(400).json({ message: "Thiếu email" });

  try {
    const [user] = await pool.query("SELECT id FROM users WHERE email=?", [
      email,
    ]);
    if (!user.length)
      return res.status(400).json({ message: "Email không tồn tại" });

    const otp = Math.floor(100000 + Math.random() * 900000);
    const expiresAt = Date.now() + 5 * 60 * 1000;

    await pool.query(
      "INSERT INTO otp_codes(email, code, expires_at) VALUES(?, ?, ?)",
      [email, otp, expiresAt]
    );

    await sendMail(
      email,
      "SpeedyShip - Khôi phục mật khẩu",
      `<h2>Mã OTP khôi phục: <b>${otp}</b></h2>`
    );

    res.json({ message: "Đã gửi OTP." });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

export const verifyForgotOtp = async (req, res) => {
  const { email, otp } = req.body;

  try {
    const [rows] = await pool.query(
      "SELECT * FROM otp_codes WHERE email=? ORDER BY id DESC LIMIT 1",
      [email]
    );

    if (!rows.length)
      return res.status(400).json({ message: "Không tìm thấy OTP" });

    const record = rows[0];

    if (record.code !== otp)
      return res.status(400).json({ message: "OTP sai" });

    if (Date.now() > record.expires_at)
      return res.status(400).json({ message: "OTP hết hạn" });

    const resetToken = jwt.sign({ email }, "secret-reset", {
      expiresIn: "15m",
    });

    res.json({ message: "OTP hợp lệ", resetToken });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// Đặt lại mật khẩu
export const resetPassword = async (req, res) => {
  const { email, newPassword, token } = req.body;

  try {
    const payload = jwt.verify(token, "secret-reset");

    if (payload.email !== email)
      return res.status(401).json({ message: "Token không khớp email!" });

    const hash = await bcrypt.hash(newPassword, 10);
    await pool.query("UPDATE users SET password=? WHERE email=?", [
      hash,
      email,
    ]);

    res.json({ message: "Đổi mật khẩu thành công" });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};
