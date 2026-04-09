import { useEffect, useState } from "react";
import API from "../../services/api";
import toast from "react-hot-toast";
import { CreditCard, Search, Trash2, DollarSign, Wallet } from "lucide-react";
import Pagination from "../../components/Pagination";

export default function AdminPayments() {
  const [payments, setPayments] = useState([]);
  const [filtered, setFiltered] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");

  // 🧭 State Phân trang
  const [page, setPage] = useState(1);
  const perPage = 8; // Số lượng item mỗi trang

  // 🧾 Lấy danh sách thanh toán
  const fetchPayments = async () => {
    setLoading(true);
    try {
      const res = await API.get("/payments");
      setPayments(res.data);
      setFiltered(res.data);
    } catch {
      toast.error("❌ Lỗi khi tải danh sách thanh toán");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPayments();
  }, []);

  // 🔍 Filter Logic
  useEffect(() => {
    const keyword = search.toLowerCase();
    const result = payments.filter(
      (p) =>
        p.tracking_code?.toLowerCase().includes(keyword) ||
        p.customer_name?.toLowerCase().includes(keyword)
    );
    setFiltered(result);
    setPage(1); // ✅ Sửa: Reset về trang 1 khi tìm kiếm
  }, [search, payments]);

  // ✏️ Cập nhật trạng thái
  const handleUpdate = async (id, status) => {
    try {
      await API.put(`/payments/${id}`, { status });
      toast.success("✅ Đã cập nhật trạng thái");
      fetchPayments();
    } catch {
      toast.error("❌ Cập nhật thất bại");
    }
  };

  // 🗑️ Xóa thanh toán
  const handleDelete = async (id) => {
    if (confirm("Bạn có chắc muốn xóa lịch sử thanh toán này không?")) {
      try {
        await API.delete(`/payments/${id}`);
        toast.success("🗑️ Đã xóa thanh toán");
        fetchPayments();
      } catch {
        toast.error("❌ Lỗi khi xóa thanh toán");
      }
    }
  };

  // 📦 Logic phân trang (Đã sửa tên biến cho khớp với state)
  const totalPages = Math.ceil(filtered.length / perPage);
  const startIndex = (page - 1) * perPage;
  const currentPayments = filtered.slice(startIndex, startIndex + perPage);

  // 🎨 Helper Render
  const getMethodBadge = (method) => {
    const m = method?.toLowerCase();
    if (m === "momo")
      return (
        <span className="flex items-center gap-1 text-pink-600 font-bold bg-pink-50 px-2 py-1 rounded border border-pink-200 text-xs">
          <Wallet size={12} /> MoMo
        </span>
      );
    if (m === "banktransfer" || m === "banking")
      return (
        <span className="flex items-center gap-1 text-blue-600 font-bold bg-blue-50 px-2 py-1 rounded border border-blue-200 text-xs">
          <CreditCard size={12} /> Chuyển khoản
        </span>
      );
    return (
      <span className="flex items-center gap-1 text-green-600 font-bold bg-green-50 px-2 py-1 rounded border border-green-200 text-xs">
        <DollarSign size={12} /> Tiền mặt
      </span>
    );
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-500 font-sans">
      {/* 1. Header & Search */}
      <div className="bg-white p-5 rounded-xl shadow-sm border border-gray-100 flex flex-col sm:flex-row justify-between items-center gap-4">
        <div>
          <h1 className="text-xl font-bold text-[#113e48] flex items-center gap-2">
            <CreditCard className="text-orange-500" size={24} /> Quản lý thanh
            toán
          </h1>
          <p className="text-xs text-gray-500 mt-1">
            Tổng cộng:{" "}
            <span className="font-bold text-[#113e48]">{filtered.length}</span>{" "}
            giao dịch
          </p>
        </div>

        <div className="relative w-full sm:w-72">
          <Search
            className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"
            size={18}
          />
          <input
            type="text"
            placeholder="Tìm mã vận đơn, khách hàng..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-10 pr-4 py-2.5 bg-gray-50 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500 transition-all"
          />
        </div>
      </div>

      {/* 2. Table */}
      <div className="bg-white border border-gray-100 rounded-xl shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm text-left">
            <thead className="bg-gray-50 text-gray-500 font-medium border-b border-gray-100">
              <tr>
                <th className="px-6 py-4">Mã vận đơn</th>
                <th className="px-6 py-4">Khách hàng</th>
                <th className="px-6 py-4">Số tiền</th>
                <th className="px-6 py-4">Phương thức</th>
                <th className="px-6 py-4 text-center">Trạng thái</th>
                <th className="px-6 py-4 text-center">Ngày tạo</th>
                <th className="px-6 py-4 text-center">Thao tác</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {loading ? (
                [...Array(5)].map((_, i) => (
                  <tr key={i}>
                    <td colSpan="7" className="px-6 py-4">
                      <div className="h-4 bg-gray-100 rounded animate-pulse"></div>
                    </td>
                  </tr>
                ))
              ) : currentPayments.length > 0 ? (
                currentPayments.map((p) => (
                  <tr
                    key={p.id}
                    className="hover:bg-gray-50/50 transition-colors"
                  >
                    <td className="px-6 py-4 font-bold text-[#113e48]">
                      #{p.tracking_code || "---"}
                    </td>
                    <td className="px-6 py-4 font-medium text-gray-700">
                      {p.customer_name || "Khách lẻ"}
                    </td>
                    <td className="px-6 py-4 text-green-600 font-bold text-base">
                      {Number(p.amount).toLocaleString("vi-VN")} ₫
                    </td>
                    <td className="px-6 py-4">{getMethodBadge(p.method)}</td>
                    <td className="px-6 py-4 text-center">
                      <select
                        value={p.status}
                        onChange={(e) => handleUpdate(p.id, e.target.value)}
                        className={`border-none bg-transparent outline-none font-bold text-xs cursor-pointer px-2 py-1 rounded-full ${
                          p.status === "completed"
                            ? "text-green-700 bg-green-100"
                            : p.status === "pending"
                            ? "text-yellow-700 bg-yellow-100"
                            : "text-red-700 bg-red-100"
                        }`}
                      >
                        <option value="pending">⏳ Đang xử lý</option>
                        <option value="completed">✅ Hoàn tất</option>
                        <option value="failed">❌ Thất bại</option>
                      </select>
                    </td>
                    <td className="px-6 py-4 text-center text-gray-500 text-xs">
                      {new Date(p.created_at).toLocaleString("vi-VN")}
                    </td>
                    <td className="px-6 py-4 text-center">
                      <button
                        onClick={() => handleDelete(p.id)}
                        className="p-2 text-red-500 hover:bg-red-50 rounded-lg transition-colors"
                        title="Xóa giao dịch"
                      >
                        <Trash2 size={16} />
                      </button>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td
                    colSpan="7"
                    className="px-6 py-12 text-center text-gray-400 italic"
                  >
                    Không tìm thấy dữ liệu thanh toán.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {/* 3. Pagination Component */}
        <Pagination
          currentPage={page}
          totalPages={totalPages}
          onPageChange={setPage}
        />
      </div>
    </div>
  );
}
