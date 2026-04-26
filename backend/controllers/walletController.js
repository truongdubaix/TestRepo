import db from "../config/db.js";


export const getWallet = async (req, res) => {
  try {
    const { user_id } = req.params;


    const [existing] = await db.query(
      "SELECT * FROM wallets WHERE user_id = ?",
      [user_id]
    );

    if (existing.length === 0) {

      await db.query("INSERT INTO wallets (user_id) VALUES (?)", [user_id]);
      const [newWallet] = await db.query(
        "SELECT * FROM wallets WHERE user_id = ?",
        [user_id]
      );
      return res.json(newWallet[0]);
    }

    res.json(existing[0]);
  } catch (err) {
    res.status(500).json({ error: "Lỗi lấy thông tin ví" });
  }
};


// Lấy lịch sử giao dịch ví
export const getTransactions = async (req, res) => {
  try {
    const { wallet_id } = req.params;
    const [rows] = await db.query(
      "SELECT * FROM transactions WHERE wallet_id = ? ORDER BY created_at DESC",
      [wallet_id]
    );
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: "Lỗi lấy lịch sử giao dịch" });
  }
};


export const depositMoney = async (req, res) => {
  try {
    const { wallet_id, amount, description } = req.body;

    if (!wallet_id || !amount || amount <= 0) {
      return res.status(400).json({ error: "Số tiền không hợp lệ" });
    }


    await db.query("UPDATE wallets SET balance = balance + ? WHERE id = ?", [
      amount,
      wallet_id,
    ]);


    await db.query(
      "INSERT INTO transactions (wallet_id, type, amount, description, status) VALUES (?, 'deposit', ?, ?, 'success')",
      [wallet_id, amount, description || "Nạp tiền vào tài khoản"]
    );

    res.json({ message: "Nạp tiền thành công" });
  } catch (err) {
    res.status(500).json({ error: "Lỗi nạp tiền" });
  }
};
