import { useEffect, useState } from "react";
import API from "../../services/api";
import toast from "react-hot-toast";
import {
  Users,
  Search,
  Trash2,
  Lock,
  Unlock,
  Mail,
  Phone,
  ShoppingBag,
  ChevronLeft,
  ChevronRight,
} from "lucide-react";
// Import Component Pagination (nếu đã tạo ở bước trước)
import Pagination from "../../components/Pagination";

export default function AdminCustomer() {
  const [customers, setCustomers] = useState([]);
  const [filtered, setFiltered] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");

  // Pagination State
  const [page, setPage] = useState(1);
  const itemsPerPage = 8;

  // 📦 Lấy danh sách khách hàng
  const fetchCustomers = async () => {
    setLoading(true);
    try {
      const res = await API.get("/admin/customers");
      setCustomers(res.data);
      setFiltered(res.data);
    } catch (err) {
      console.error(err);
      toast.error("❌ Lỗi tải danh sách khách hàng");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCustomers();
  }, []);

  // 🔍 Tìm kiếm
  useEffect(() => {
    const keyword = search.toLowerCase();
    const result = customers.filter(
      (c) =>
        c.name.toLowerCase().includes(keyword) ||
        c.email.toLowerCase().includes(keyword) ||
        c.phone?.includes(keyword)
    );
    setFiltered(result);
    setPage(1); // Reset về trang 1 khi tìm kiếm
  }, [search, customers]);

  // 🔄 Khóa / Mở tài khoản
  const handleToggle = async (id, status) => {
    // Logic xác định trạng thái mới (Dựa vào backend trả về tiếng Việt hay Anh)
    // Giả sử backend dùng "active" / "blocked". Nếu dùng tiếng Việt thì sửa lại.
    const isActive = status === "active" || status === "Hoạt động";
    const newStatus = isActive ? "blocked" : "active";
    const confirmMsg = isActive
      ? "Bạn muốn khóa tài khoản này?"
      : "Bạn muốn mở khóa tài khoản này?";

    if (!confirm(confirmMsg)) return;

    try {
      await API.put(`/admin/customers/${id}`, { status: newStatus });
      toast.success(
        isActive ? "🔒 Đã khóa tài khoản" : "✅ Đã mở khóa tài khoản"
      );
      fetchCustomers();
    } catch {
      toast.error("❌ Không thể cập nhật trạng thái");
    }
  };

  // 🗑️ Xóa khách hàng
  const handleDelete = async (id) => {
    if (
      !confirm(
        "⚠️ CẢNH BÁO: Xóa khách hàng sẽ xóa toàn bộ dữ liệu liên quan. Bạn có chắc chắn không?"
      )
    )
      return;
    try {
      await API.delete(`/admin/customers/${id}`);
      toast.success("🗑️ Đã xóa khách hàng");
      fetchCustomers();
    } catch {
      toast.error("❌ Xóa thất bại");
    }
  };

  // 📦 Logic phân trang
  const totalPages = Math.ceil(filtered.length / itemsPerPage);
  const startIndex = (page - 1) * itemsPerPage;
  const currentCustomers = filtered.slice(
    startIndex,
    startIndex + itemsPerPage
  );

  return (
    <div className="space-y-6 animate-in fade-in duration-500 font-sans">
      {/* HEADER & SEARCH */}
      <div className="bg-white p-5 rounded-xl shadow-sm border border-gray-100 flex flex-col sm:flex-row justify-between items-center gap-4">
        <div>
          <h1 className="text-xl font-bold text-[#113e48] flex items-center gap-2">
            <Users className="text-orange-500" size={24} /> Quản lý khách hàng
          </h1>
          <p className="text-xs text-gray-500 mt-1">
            Tổng số:{" "}
            <span className="font-bold text-[#113e48]">{filtered.length}</span>{" "}
            khách hàng
          </p>
        </div>

        <div className="relative w-full sm:w-72">
          <Search
            className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"
            size={18}
          />
          <input
            type="text"
            placeholder="Tìm theo tên, email, sđt..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-10 pr-4 py-2.5 bg-gray-50 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500 transition-all"
          />
        </div>
      </div>

      {/* TABLE */}
      <div className="bg-white border border-gray-100 rounded-xl shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm text-left">
            <thead className="bg-gray-50 text-gray-500 font-medium border-b border-gray-100">
              <tr>
                <th className="px-6 py-4">Khách hàng</th>
                <th className="px-6 py-4">Liên hệ</th>
                <th className="px-6 py-4 text-center">Đơn hàng</th>
                <th className="px-6 py-4 text-center">Trạng thái</th>
                <th className="px-6 py-4 text-center">Hành động</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {loading ? (
                [...Array(5)].map((_, i) => (
                  <tr key={i}>
                    <td colSpan="5" className="px-6 py-4">
                      <div className="h-4 bg-gray-100 rounded animate-pulse"></div>
                    </td>
                  </tr>
                ))
              ) : currentCustomers.length === 0 ? (
                <tr>
                  <td
                    colSpan="5"
                    className="px-6 py-12 text-center text-gray-400 italic"
                  >
                    Không tìm thấy khách hàng nào
                  </td>
                </tr>
              ) : (
                currentCustomers.map((c) => (
                  <tr
                    key={c.id}
                    className="hover:bg-gray-50/50 transition-colors group"
                  >
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-full bg-purple-100 text-purple-600 flex items-center justify-center font-bold text-lg shadow-sm">
                          {c.name.charAt(0).toUpperCase()}
                        </div>
                        <div>
                          <p className="font-bold text-[#113e48]">{c.name}</p>
                          <p className="text-xs text-gray-400">ID: #{c.id}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 space-y-1">
                      <div className="flex items-center gap-2 text-xs text-gray-600">
                        <Mail size={14} className="text-gray-400" /> {c.email}
                      </div>
                      <div className="flex items-center gap-2 text-xs text-gray-600">
                        <Phone size={14} className="text-gray-400" />{" "}
                        {c.phone || "Chưa cập nhật"}
                      </div>
                    </td>
                    <td className="px-6 py-4 text-center">
                      <div className="inline-flex items-center gap-1 bg-blue-50 px-2.5 py-1 rounded-lg text-blue-700 font-bold text-xs border border-blue-100">
                        <ShoppingBag size={14} /> {c.total_orders || 0}
                      </div>
                    </td>
                    <td className="px-6 py-4 text-center">
                      {c.status === "active" || c.status === "Hoạt động" ? (
                        <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-green-100 text-green-700 border border-green-200">
                          Hoạt động
                        </span>
                      ) : (
                        <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-red-100 text-red-700 border border-red-200">
                          Đã khóa
                        </span>
                      )}
                    </td>
                    <td className="px-6 py-4 text-center">
                      <div className="flex justify-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                        <button
                          onClick={() => handleToggle(c.id, c.status)}
                          className={`p-2 rounded-lg transition-colors border ${
                            c.status === "active" || c.status === "Hoạt động"
                              ? "text-orange-500 border-orange-200 hover:bg-orange-50"
                              : "text-green-600 border-green-200 hover:bg-green-50"
                          }`}
                          title={
                            c.status === "active" || c.status === "Hoạt động"
                              ? "Khóa tài khoản"
                              : "Mở khóa"
                          }
                        >
                          {c.status === "active" || c.status === "Hoạt động" ? (
                            <Lock size={16} />
                          ) : (
                            <Unlock size={16} />
                          )}
                        </button>
                        <button
                          onClick={() => handleDelete(c.id)}
                          className="p-2 text-red-500 hover:bg-red-50 rounded-lg border border-transparent hover:border-red-100 transition-colors"
                          title="Xóa vĩnh viễn"
                        >
                          <Trash2 size={16} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* PHÂN TRANG */}
        <Pagination
          currentPage={page}
          totalPages={totalPages}
          onPageChange={setPage}
        />
      </div>
    </div>
  );
}
