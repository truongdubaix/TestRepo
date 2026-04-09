import { useEffect, useState } from "react";
import API from "../../services/api";
import toast from "react-hot-toast";
import {
  MessageSquare,
  Search,
  Trash2,
  Star,
  Calendar,
  User,
  Package,
} from "lucide-react";
// Import component phân trang đã tạo ở bước trước
import Pagination from "../../components/Pagination";

export default function AdminFeedbacks() {
  const [feedbacks, setFeedbacks] = useState([]);
  const [filtered, setFiltered] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");

  // Pagination State
  const [page, setPage] = useState(1);
  const itemsPerPage = 8;

  // 📦 1. Fetch Data
  const fetchFeedbacks = async () => {
    setLoading(true);
    try {
      const res = await API.get("/feedbacks");
      setFeedbacks(res.data);
      setFiltered(res.data);
    } catch {
      toast.error("❌ Lỗi tải danh sách đánh giá");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchFeedbacks();
  }, []);

  // 🔍 2. Filter Logic
  useEffect(() => {
    const keyword = search.toLowerCase();
    const result = feedbacks.filter(
      (f) =>
        f.customer_name?.toLowerCase().includes(keyword) ||
        f.tracking_code?.toLowerCase().includes(keyword) ||
        f.content?.toLowerCase().includes(keyword)
    );
    setFiltered(result);
    setPage(1); // Reset về trang 1 khi tìm kiếm
  }, [search, feedbacks]);

  // 🗑️ 3. Delete Handler
  const handleDelete = async (id) => {
    if (confirm("Bạn có chắc muốn xóa đánh giá này không?")) {
      try {
        await API.delete(`/feedbacks/${id}`);
        toast.success("🗑️ Đã xóa feedback");
        fetchFeedbacks();
      } catch {
        toast.error("❌ Xóa thất bại");
      }
    }
  };

  // ⭐ 4. Helper: Render Stars
  const renderStars = (rating) => {
    return (
      <div className="flex gap-0.5">
        {[...Array(5)].map((_, i) => (
          <Star
            key={i}
            size={14}
            className={
              i < rating ? "fill-orange-400 text-orange-400" : "text-gray-300"
            }
          />
        ))}
      </div>
    );
  };

  // 📦 5. Pagination Logic
  const totalPages = Math.ceil(filtered.length / itemsPerPage);
  const startIndex = (page - 1) * itemsPerPage;
  const currentFeedbacks = filtered.slice(
    startIndex,
    startIndex + itemsPerPage
  );

  return (
    <div className="space-y-6 animate-in fade-in duration-500 font-sans">
      {/* HEADER & SEARCH */}
      <div className="bg-white p-5 rounded-xl shadow-sm border border-gray-100 flex flex-col sm:flex-row justify-between items-center gap-4">
        <div>
          <h1 className="text-xl font-bold text-[#113e48] flex items-center gap-2">
            <MessageSquare className="text-orange-500" size={24} /> Quản lý đánh
            giá
          </h1>
          <p className="text-xs text-gray-500 mt-1">
            Tổng số:{" "}
            <span className="font-bold text-[#113e48]">{filtered.length}</span>{" "}
            đánh giá
          </p>
        </div>

        <div className="relative w-full sm:w-72">
          <Search
            className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"
            size={18}
          />
          <input
            type="text"
            placeholder="Tìm theo tên, mã vận đơn..."
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
                <th className="px-6 py-4">Đơn hàng</th>
                <th className="px-6 py-4 w-1/3">Nội dung đánh giá</th>
                <th className="px-6 py-4 text-center">Xếp hạng</th>
                <th className="px-6 py-4 text-center">Ngày tạo</th>
                <th className="px-6 py-4 text-center">Thao tác</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {loading ? (
                [...Array(5)].map((_, i) => (
                  <tr key={i}>
                    <td colSpan="6" className="px-6 py-4">
                      <div className="h-4 bg-gray-100 rounded animate-pulse"></div>
                    </td>
                  </tr>
                ))
              ) : currentFeedbacks.length === 0 ? (
                <tr>
                  <td
                    colSpan="6"
                    className="px-6 py-12 text-center text-gray-400 italic"
                  >
                    Chưa có đánh giá nào từ khách hàng.
                  </td>
                </tr>
              ) : (
                currentFeedbacks.map((f) => (
                  <tr
                    key={f.id}
                    className="hover:bg-gray-50/50 transition-colors"
                  >
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-2 font-bold text-[#113e48]">
                        <User size={14} className="text-gray-400" />{" "}
                        {f.customer_name}
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-2 text-blue-600 bg-blue-50 px-2 py-1 rounded w-fit text-xs font-medium border border-blue-100">
                        <Package size={12} /> {f.tracking_code}
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <p
                        className="text-gray-700 line-clamp-2"
                        title={f.content}
                      >
                        "{f.content}"
                      </p>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex justify-center flex-col items-center gap-1">
                        {renderStars(f.rating)}
                        <span className="text-[10px] font-bold text-gray-400">
                          ({f.rating}/5)
                        </span>
                      </div>
                    </td>
                    <td className="px-6 py-4 text-center text-gray-500 text-xs">
                      <div className="flex items-center justify-center gap-1">
                        <Calendar size={12} />
                        {new Date(f.created_at).toLocaleDateString("vi-VN")}
                      </div>
                    </td>
                    <td className="px-6 py-4 text-center">
                      <button
                        onClick={() => handleDelete(f.id)}
                        className="p-2 text-red-500 hover:bg-red-50 rounded-lg transition-colors border border-transparent hover:border-red-100"
                        title="Xóa đánh giá"
                      >
                        <Trash2 size={16} />
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* PAGINATION */}
        <Pagination
          currentPage={page}
          totalPages={totalPages}
          onPageChange={setPage}
        />
      </div>
    </div>
  );
}
