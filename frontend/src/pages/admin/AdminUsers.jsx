import { useEffect, useState } from "react";
import toast from "react-hot-toast";
import API from "../../services/api";
import {
  Users,
  Search,
  Trash2,
  Mail,
  Calendar,
  Shield,
  User,
  Truck,
  ShoppingBag,
} from "lucide-react";
import Pagination from "../../components/Pagination";

export default function AdminUsers() {
  const [users, setUsers] = useState([]);
  const [roles, setRoles] = useState([]);
  const [filtered, setFiltered] = useState([]);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);

  // Pagination State
  const [page, setPage] = useState(1);
  const itemsPerPage = 8;

  // 🔹 1. Fetch Data
  const fetchData = async () => {
    setLoading(true);
    try {
      const [usersRes, rolesRes] = await Promise.all([
        API.get("/users"),
        API.get("/roles"),
      ]);
      setUsers(usersRes.data);
      setFiltered(usersRes.data);
      setRoles(rolesRes.data);
    } catch (err) {
      toast.error("❌ Lỗi khi tải dữ liệu!");
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  // 🔹 2. Filter Logic
  useEffect(() => {
    const keyword = search.toLowerCase();
    const result = users.filter(
      (u) =>
        u.name?.toLowerCase().includes(keyword) ||
        u.email?.toLowerCase().includes(keyword),
    );
    setFiltered(result);
    setPage(1);
  }, [search, users]);

  // 🔹 3. Update User
  const handleUpdate = async (id, field, value) => {
    try {
      const payload =
        field === "role_id" ? { role_id: value } : { status: value };
      await API.put(`/users/${id}`, payload);
      toast.success("✅ Cập nhật thành công!");
      fetchData();
    } catch (err) {
      toast.error("❌ Cập nhật thất bại!");
    }
  };

  // 🔹 4. Delete User
  const handleDelete = async (id) => {
    if (confirm("Bạn có chắc muốn xóa người dùng này không?")) {
      try {
        await API.delete(`/users/${id}`);
        toast.success("🗑️ Đã xóa người dùng!");
        fetchData();
      } catch {
        toast.error("❌ Xóa thất bại!");
      }
    }
  };

  // 🎨 5. Helper: Lấy màu sắc và icon cho từng Role
  const getRoleStyle = (roleId) => {
    const roleName =
      roles.find((r) => r.id == roleId)?.name?.toLowerCase() || "";

    if (roleName.includes("admin") || roleName.includes("quản trị")) {
      return {
        style:
          "bg-purple-100 text-purple-700 border-purple-200 hover:bg-purple-200",
        icon: <Shield size={14} className="mr-1" />,
      };
    }
    if (roleName.includes("driver") || roleName.includes("tài xế")) {
      return {
        style: "bg-blue-100 text-blue-700 border-blue-200 hover:bg-blue-200",
        icon: <Truck size={14} className="mr-1" />,
      };
    }
    if (roleName.includes("customer") || roleName.includes("khách hàng")) {
      return {
        style:
          "bg-green-100 text-green-700 border-green-200 hover:bg-green-200",
        icon: <ShoppingBag size={14} className="mr-1" />,
      };
    }
    // Mặc định (User thường hoặc Staff khác)
    return {
      style: "bg-gray-100 text-gray-700 border-gray-200 hover:bg-gray-200",
      icon: <User size={14} className="mr-1" />,
    };
  };

  // Pagination Logic
  const totalPages = Math.ceil(filtered.length / itemsPerPage);
  const startIndex = (page - 1) * itemsPerPage;
  const currentUsers = filtered.slice(startIndex, startIndex + itemsPerPage);

  return (
    <div className="space-y-6 animate-in fade-in duration-500 font-sans">
      {/* HEADER & SEARCH */}
      <div className="bg-white p-5 rounded-xl shadow-sm border border-gray-100 flex flex-col sm:flex-row justify-between items-center gap-4">
        <div>
          <h1 className="text-xl font-bold text-[#113e48] flex items-center gap-2">
            <Users className="text-orange-500" size={24} /> Quản lý người dùng
          </h1>
          <p className="text-xs text-gray-500 mt-1">
            Tổng số:{" "}
            <span className="font-bold text-[#113e48]">{filtered.length}</span>{" "}
            tài khoản
          </p>
        </div>

        <div className="relative w-full sm:w-72">
          <Search
            className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"
            size={18}
          />
          <input
            type="text"
            placeholder="Tìm theo tên, email..."
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
                <th className="px-6 py-4">Người dùng</th>
                <th className="px-6 py-4">Email</th>
                <th className="px-6 py-4 text-center">Vai trò</th>
                <th className="px-6 py-4 text-center">Trạng thái</th>
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
              ) : currentUsers.length === 0 ? (
                <tr>
                  <td
                    colSpan="6"
                    className="px-6 py-12 text-center text-gray-400 italic"
                  >
                    Không tìm thấy người dùng nào.
                  </td>
                </tr>
              ) : (
                currentUsers.map((u) => {
                  // Lấy style cho role hiện tại
                  const roleStyle = getRoleStyle(u.role_id);

                  return (
                    <tr
                      key={u.id}
                      className="hover:bg-gray-50/50 transition-colors"
                    >
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-3">
                          <div className="w-9 h-9 rounded-full bg-orange-100 text-orange-600 flex items-center justify-center font-bold text-sm shadow-sm border border-orange-200">
                            {u.name?.charAt(0).toUpperCase()}
                          </div>
                          <span className="font-bold text-[#113e48]">
                            {u.name}
                          </span>
                        </div>
                      </td>
                      <td className="px-6 py-4 text-gray-600">
                        <div className="flex items-center gap-2">
                          <Mail size={14} className="text-gray-400" /> {u.email}
                        </div>
                      </td>

                      {/* --- CỘT VAI TRÒ (ĐÃ SỬA LẠI ĐẸP HƠN) --- */}
                      <td className="px-6 py-4 text-center">
                        <div className="relative inline-flex items-center justify-center">
                          {/* Icon minh họa bên trái select */}
                          <div className="absolute left-2 pointer-events-none text-gray-500">
                            {roleStyle.icon}
                          </div>

                          <select
                            value={u.role_id}
                            onChange={(e) =>
                              handleUpdate(u.id, "role_id", e.target.value)
                            }
                            className={`
                                appearance-none pl-7 pr-8 py-1.5 rounded-lg text-xs font-bold border cursor-pointer outline-none transition-all shadow-sm
                                ${roleStyle.style}
                              `}
                          >
                            {roles.map((r) => (
                              <option
                                key={r.id}
                                value={r.id}
                                className="bg-white text-gray-700"
                              >
                                {r.name}
                              </option>
                            ))}
                          </select>

                          {/* Mũi tên custom */}
                          <div className="absolute right-2 pointer-events-none text-gray-500 opacity-60">
                            ▼
                          </div>
                        </div>
                      </td>

                      <td className="px-6 py-4 text-center">
                        <select
                          value={u.status}
                          onChange={(e) =>
                            handleUpdate(u.id, "status", e.target.value)
                          }
                          className={`border-none bg-transparent outline-none font-bold text-xs cursor-pointer px-2 py-1 rounded-full transition-colors ${
                            u.status === "active" || u.status === "Hoạt động"
                              ? "text-green-700 bg-green-50 hover:bg-green-100"
                              : "text-red-600 bg-red-50 hover:bg-red-100"
                          }`}
                        >
                          <option value="active">🟢 Hoạt động</option>
                          <option value="blocked">🔴 Đã khóa</option>
                        </select>
                      </td>
                      <td className="px-6 py-4 text-center text-gray-500 text-xs">
                        <div className="flex items-center justify-center gap-1">
                          <Calendar size={12} />{" "}
                          {new Date(u.created_at).toLocaleDateString("vi-VN")}
                        </div>
                      </td>
                      <td className="px-6 py-4 text-center">
                        <button
                          onClick={() => handleDelete(u.id)}
                          className="p-2 text-red-500 hover:bg-red-50 rounded-lg transition-colors border border-transparent hover:border-red-100"
                          title="Xóa người dùng"
                        >
                          <Trash2 size={16} />
                        </button>
                      </td>
                    </tr>
                  );
                })
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
