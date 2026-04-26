import pool from "../config/db.js";


// Lấy danh sách tất cả người dùng
export const getAllUsers = async (req, res) => {
  try {
    const { role } = req.query;

    let sql = `
      SELECT 
        DISTINCT u.id,
        u.name,
        u.email,
        u.status,
        u.created_at,
        ur.role_id,
        r.name AS role_name,  
        r.code AS role_code
      FROM users u
      LEFT JOIN user_roles ur ON u.id = ur.user_id
      LEFT JOIN roles r ON ur.role_id = r.id
    `;


    const params = [];
    if (role) {
      sql += ` WHERE r.code = ? `;
      params.push(role);
    }

    sql += " ORDER BY u.id DESC";

    const [rows] = await pool.query(sql, params);
    res.json(rows);
  } catch (error) {
    res.status(500).json({
      message: "Lỗi server khi lấy danh sách người dùng",
      error,
    });
  }
};


// Cập nhật thông tin người dùng
export const updateUser = async (req, res) => {
  try {
    const { id } = req.params;
    const { name, email, status, role_id } = req.body;




    const [[user]] = await pool.query("SELECT * FROM users WHERE id = ?", [id]);
    if (!user) return res.status(404).json({ message: "Không tìm thấy user" });


    await pool.query(
      "UPDATE users SET name = ?, email = ?, status = ? WHERE id = ?",
      [name || user.name, email || user.email, status || user.status, id]
    );


    if (role_id) {
      const [[exist]] = await pool.query(
        "SELECT * FROM user_roles WHERE user_id = ?",
        [id]
      );

      if (exist) {
        await pool.query(
          "UPDATE user_roles SET role_id = ? WHERE user_id = ?",
          [role_id, id]
        );
      } else {
        await pool.query(
          "INSERT INTO user_roles (user_id, role_id) VALUES (?, ?)",
          [id, role_id]
        );
      }


      switch (Number(role_id)) {

        case 1:
          await pool.query("DELETE FROM drivers WHERE user_id = ?", [id]);
          break;


        case 2:
          await pool.query("DELETE FROM drivers WHERE user_id = ?", [id]);
          break;


        case 3:
          const [[driverExist]] = await pool.query(
            "SELECT * FROM drivers WHERE user_id = ?",
            [id]
          );
          if (!driverExist) {
            await pool.query(
              `INSERT INTO drivers (name, email, phone, status, user_id)
               VALUES (?, ?, ?, 'available', ?)`,
              [name || user.name, email || user.email, user.phone || null, id]
            );
          }
          break;


        case 4:
          await pool.query("DELETE FROM drivers WHERE user_id = ?", [id]);
          break;

        default:
      }
    }

    res.json({ message: "✅ Cập nhật người dùng thành công" });
  } catch (err) {
    res.status(500).json({
      message: "Lỗi khi cập nhật người dùng",
      error: err.message,
    });
  }
};

// Xóa tài khoản người dùng
export const deleteUser = async (req, res) => {
  try {
    const { id } = req.params;


    await pool.query("DELETE FROM user_roles WHERE user_id = ?", [id]);


    await pool.query("DELETE FROM drivers WHERE user_id = ?", [id]);


    await pool.query("DELETE FROM users WHERE id = ?", [id]);

    res.json({
      message: "🗑️ Đã xóa người dùng và dữ liệu liên quan thành công",
    });
  } catch (error) {
    res.status(500).json({ message: "Lỗi server khi xóa người dùng" });
  }
};
