import db from "../config/db.js";
import nodemailer from "nodemailer";


const transporter = nodemailer.createTransport({
  service: "gmail",
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS,
  },
});


// Gửi form liên hệ
export const createContact = async (req, res) => {
  try {
    const { name, email, phone, message } = req.body;
    if (!name || !email || !message)
      return res.status(400).json({ error: "Thiếu thông tin bắt buộc" });


    await db.query(
      `INSERT INTO contacts (name, email, phone, message, status)
       VALUES (?, ?, ?, ?, 'pending')`,
      [name, email, phone || null, message]
    );


    await transporter.sendMail({
      from: `"SpeedyShip Hỗ trợ Khách hàng" <${process.env.EMAIL_USER}>`,
      to: email,
      subject: "SpeedyShip | Xác nhận yêu cầu hỗ trợ của bạn",
      html: `
    <div style="font-family: Arial, sans-serif; line-height: 1.6; color: #333;">
      <h2 style="color: #007bff;">Xin chào ${name},</h2>
      <p>
        Cảm ơn bạn đã tin tưởng và liên hệ với <strong>SpeedyShip Đà Nẵng</strong>.
        Chúng tôi đã tiếp nhận yêu cầu hỗ trợ của bạn với nội dung sau:
      </p>
      <blockquote style="border-left: 4px solid #007bff; padding-left: 10px; color: #555;">
        ${message}
      </blockquote>
      <p>
        Bộ phận chăm sóc khách hàng của chúng tôi sẽ xem xét và phản hồi trong thời gian sớm nhất
        (thông thường trong vòng <strong>24 giờ làm việc</strong>).
      </p>
      <p>
        Nếu bạn cần hỗ trợ gấp, vui lòng liên hệ tổng đài:
        <strong style="color:#007bff;">1900 888 999</strong> hoặc gửi email về
        <a href="mailto:support@speedyship.com">support@speedyship.com</a>.
      </p>
      <br/>
      <p>Trân trọng,</p>
      <p><strong>Đội ngũ SpeedyShip Đà Nẵng</strong><br/>
      Địa chỉ: 55 Nguyễn Văn Linh, Hải Châu, Đà Nẵng<br/>
      Website: <a href="http://localhost:5173" style="color:#007bff;">speedyship.vn</a></p>
      <hr style="border:none;border-top:1px solid #eee;margin:20px 0;">
      <p style="font-size:12px;color:gray;">
        Email này được gửi tự động từ hệ thống SpeedyShip. Vui lòng không trả lời trực tiếp.
      </p>
    </div>
  `,
    });


    await transporter.sendMail({
      from: `"SpeedyShip BOT" <${process.env.EMAIL_USER}>`,
      to: "support@speedyship.com",
      subject: `📩 Yêu cầu liên hệ mới từ khách hàng ${name}`,
      html: `
    <div style="font-family: Arial, sans-serif; line-height:1.6; color:#333;">
      <h3 style="color:#007bff;">Yêu cầu liên hệ mới từ khách hàng:</h3>
      <ul>
        <li><strong>Họ tên:</strong> ${name}</li>
        <li><strong>Email:</strong> ${email}</li>
        <li><strong>Số điện thoại:</strong> ${phone || "Không cung cấp"}</li>
      </ul>
      <p><strong>Nội dung yêu cầu:</strong></p>
      <blockquote style="border-left: 4px solid #007bff; padding-left: 10px; color: #555;">
        ${message}
      </blockquote>
      <p>
        Vui lòng kiểm tra chi tiết tại trang quản trị:
        <a href="http://localhost:5173/admin/contact" style="color:#007bff;">Admin Contact Dashboard</a>
      </p>
      <hr style="border:none;border-top:1px solid #eee;margin:20px 0;">
      <p style="font-size:12px;color:gray;">
        Email thông báo nội bộ từ hệ thống SpeedyShip.
      </p>
    </div>
  `,
    });

    res.json({
      success: true,
      message: "✅ Đã lưu liên hệ và gửi email xác nhận thành công!",
    });
  } catch (err) {
    res.status(500).json({ error: "Không thể gửi yêu cầu hoặc email" });
  }
};

export const assignDispatcher = async (req, res) => {
  try {
    const { id } = req.params;
    const { dispatcher_id } = req.body;

    if (!dispatcher_id)
      return res.status(400).json({ error: "Thiếu ID điều phối viên" });


    await db.query(
      "UPDATE contacts SET status = 'approved', assigned_to = ? WHERE id = ?",
      [dispatcher_id, id]
    );

    res.json({
      success: true,
      message: "✅ Đã giao yêu cầu cho điều phối viên thành công!",
    });
  } catch (err) {
    res.status(500).json({ error: "Không thể giao yêu cầu" });
  }
};

// Lấy danh sách liên hệ
export const getAllContacts = async (req, res) => {
  try {
    const [rows] = await db.query(`
      SELECT 
        c.id,
        c.name,
        c.email,
        c.phone,
        c.message,
        c.status,
        c.note,
        c.created_at,
        u.name AS assigned_name
      FROM contacts c
      LEFT JOIN users u ON c.assigned_to = u.id
      ORDER BY c.created_at DESC
    `);

    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: "Không thể lấy danh sách liên hệ" });
  }
};

// Cập nhật trạng thái liên hệ
export const updateContactStatus = async (req, res) => {
  try {
    const { id } = req.params;
    const { status, note } = req.body;

    if (!status)
      return res.status(400).json({ error: "Thiếu trạng thái cập nhật" });


    await db.query(
      "UPDATE contacts SET status = ?, note = ?, updated_at = NOW() WHERE id = ?",
      [status, note || null, id]
    );


    if (status === "resolved") {
      const [[contact]] = await db.query(
        "SELECT name, email FROM contacts WHERE id = ?",
        [id]
      );

      if (contact?.email) {
        await transporter.sendMail({
          from: `"SpeedyShip Hỗ trợ" <${process.env.EMAIL_USER}>`,
          to: contact.email,
          subject: "SpeedyShip | Yêu cầu của bạn đã được xử lý",
          html: `
            <div style="font-family: Arial, sans-serif; color: #333; line-height: 1.6;">
              <h2 style="color: #007bff;">Xin chào ${contact.name},</h2>
              <p>
                Chúng tôi xin thông báo rằng yêu cầu hỗ trợ của bạn đã được đội ngũ 
                <strong>SpeedyShip Đà Nẵng</strong> xử lý thành công.
              </p>
              <p>
                Cảm ơn bạn đã dành thời gian liên hệ với chúng tôi.
                Rất mong tiếp tục được đồng hành cùng bạn trong những đơn hàng sắp tới!
              </p>
              <br/>
              <p>Trân trọng,<br/><strong>SpeedyShip Team</strong></p>
              <hr style="border:none;border-top:1px solid #eee;margin:20px 0;">
              <p style="font-size:12px;color:gray;">
                Đây là email tự động từ hệ thống SpeedyShip - vui lòng không trả lời trực tiếp.
              </p>
            </div>
          `,
        });
      }
    }

    res.json({
      success: true,
      message: "✅ Cập nhật trạng thái liên hệ thành công!",
    });
  } catch (err) {
    res.status(500).json({ error: "Không thể cập nhật trạng thái" });
  }
};

export const getContactsByDispatcher = async (req, res) => {
  try {
    const { dispatcher_id } = req.params;

    const [rows] = await db.query(
      `
      SELECT 
        c.id, c.name, c.email, c.phone, c.message, 
        c.status, c.created_at, c.note
      FROM contacts c
      WHERE c.assigned_to = ?
      ORDER BY c.created_at DESC
      `,
      [dispatcher_id]
    );

    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: "Không thể lấy danh sách liên hệ" });
  }
};
