import db from "../config/db.js";

// Lấy danh sách tin tức
export const getAllNews = async (req, res) => {
  try {
    const [rows] = await db.query(
      "SELECT * FROM news ORDER BY created_at DESC"
    );
    res.json(rows);
  } catch (error) {
    res.status(500).json({ message: "Lỗi server khi lấy tin tức" });
  }
};

// Lấy chi tiết tin tức
export const getNewsById = async (req, res) => {
  const { id } = req.params;
  try {
    const [rows] = await db.query("SELECT * FROM news WHERE id = ?", [id]);
    if (rows.length === 0) {
      return res.status(404).json({ message: "Không tìm thấy bài viết" });
    }
    

    res.json(rows[0]);
  } catch (error) {
    res.status(500).json({ message: "Lỗi server khi tải bài viết" });
  }
};

// Đăng tin tức mới
export const createNews = async (req, res) => {
  const { title, desc, content, author } = req.body;

  let image = req.body.image || ""; 
  
  if (req.file) {

    image = `/uploads/${req.file.filename}`;
  }

  if (!title) {
    return res.status(400).json({ message: "Thiếu tiêu đề (title)" });
  }
  
  try {
    const [result] = await db.query(
      "INSERT INTO news (title, \`desc\`, content, image, author) VALUES (?, ?, ?, ?, ?)",
      [title, desc || "", content || "", image, author || "Admin"]
    );
    res.status(201).json({ 
      message: "Tạo tin tức thành công", 
      id: result.insertId 
    });
  } catch (error) {
    res.status(500).json({ message: "Lỗi server khi tạo tin tức" });
  }
};

// Cập nhật tin tức
export const updateNews = async (req, res) => {
  const { id } = req.params;
  const { title, desc, content, author } = req.body;
  

  let image = req.body.image || "";
  if (req.file) {

    image = `/uploads/${req.file.filename}`;
  }
  
  if (!title) {
    return res.status(400).json({ message: "Thiếu tiêu đề (title)" });
  }
  
  try {
    const [result] = await db.query(
      "UPDATE news SET title=?, \`desc\`=?, content=?, image=?, author=? WHERE id=?",
      [title, desc || "", content || "", image, author || "Admin", id]
    );
    if (result.affectedRows === 0) {
      return res.status(404).json({ message: "Không tìm thấy tin tức" });
    }
    res.json({ message: "Cập nhật tin tức thành công" });
  } catch (error) {
    res.status(500).json({ message: "Lỗi server khi cập nhật tin tức" });
  }
};

// Xóa tin tức
export const deleteNews = async (req, res) => {
  const { id } = req.params;
  try {
    const [result] = await db.query("DELETE FROM news WHERE id=?", [id]);
    if (result.affectedRows === 0) {
      return res.status(404).json({ message: "Không tìm thấy tin tức" });
    }
    res.json({ message: "Xóa tin tức thành công" });
  } catch (error) {
    res.status(500).json({ message: "Lỗi server khi xóa tin tức" });
  }
};
