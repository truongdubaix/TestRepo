import { useEffect, useState } from "react";
import API from "../../services/api";
import toast from "react-hot-toast";
import {
  PhoneCall,
  Search,
  CheckCircle,
  XCircle,
  Clock,
  UserCheck,
  Eye,
  Send,
  Mail,
  MessageSquare,
} from "lucide-react";
import Pagination from "../../components/Pagination";

export default function AdminContacts() {
  const [contacts, setContacts] = useState([]);
  const [dispatchers, setDispatchers] = useState([]);
  const [filtered, setFiltered] = useState([]);

  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);

  // Modal State
  const [showAssignModal, setShowAssignModal] = useState(false);
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [selectedContact, setSelectedContact] = useState(null);
  const [selectedDispatcher, setSelectedDispatcher] = useState("");

  // Pagination State
  const [page, setPage] = useState(1);
  const itemsPerPage = 8;

  // 🔹 1. Fetch Data
  const fetchContacts = async () => {
    setLoading(true);
    try {
      const res = await API.get("/contact");
      setContacts(res.data);
      setFiltered(res.data);
    } catch {
      toast.error("❌ Lỗi khi tải danh sách liên hệ!");
    } finally {
      setLoading(false);
    }
  };

  const fetchDispatchers = async () => {
    try {
      const res = await API.get("/users?role=dispatcher");
      setDispatchers(res.data);
    } catch (err) {
      toast.error("❌ Lỗi khi tải danh sách điều phối viên!");
    }
  };

  useEffect(() => {
    fetchContacts();
    fetchDispatchers();
  }, []);

  // 🔍 2. Filter Logic
  useEffect(() => {
    const keyword = search.toLowerCase();
    const result = contacts.filter(
      (c) =>
        c.name?.toLowerCase().includes(keyword) ||
        c.email?.toLowerCase().includes(keyword) ||
        c.message?.toLowerCase().includes(keyword)
    );
    setFiltered(result);
    setPage(1);
  }, [search, contacts]);

  // 📦 3. Giao điều phối viên
  const handleAssign = async () => {
    if (!selectedDispatcher) {
      toast.error("Vui lòng chọn điều phối viên!");
      return;
    }

    try {
      await API.patch(`/contact/${selectedContact.id}/assign`, {
        dispatcher_id: selectedDispatcher,
      });
      toast.success("✅ Đã giao yêu cầu cho điều phối viên!");
      setShowAssignModal(false);
      setSelectedDispatcher("");
      fetchContacts();
    } catch {
      toast.error("❌ Lỗi khi giao điều phối viên!");
    }
  };

  // 🎨 Helper: Badge Status (Đã sửa lỗi xuống dòng)
  const getStatusBadge = (status) => {
    const map = {
      pending: {
        label: "Chờ xử lý",
        color: "bg-yellow-100 text-yellow-700 border-yellow-200",
        icon: <Clock size={12} />,
      },
      approved: {
        label: "Đã tiếp nhận",
        color: "bg-blue-100 text-blue-700 border-blue-200",
        icon: <UserCheck size={12} />,
      },
      resolved: {
        label: "Đã giải quyết",
        color: "bg-green-100 text-green-700 border-green-200",
        icon: <CheckCircle size={12} />,
      },
    };
    const s = map[status] || {
      label: status,
      color: "bg-gray-100 text-gray-600",
    };

    return (
      // Sử dụng inline-flex và whitespace-nowrap để giữ trên 1 dòng
      <span
        className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold border whitespace-nowrap ${s.color}`}
      >
        {s.icon} {s.label}
      </span>
    );
  };

  // Pagination Logic
  const totalPages = Math.ceil(filtered.length / itemsPerPage);
  const startIndex = (page - 1) * itemsPerPage;
  const currentContacts = filtered.slice(startIndex, startIndex + itemsPerPage);

  return (
    <div className="space-y-6 animate-in fade-in duration-500 font-sans">
      {/* HEADER & SEARCH */}
      <div className="bg-white p-5 rounded-xl shadow-sm border border-gray-100 flex flex-col sm:flex-row justify-between items-center gap-4">
        <div>
          <h1 className="text-xl font-bold text-[#113e48] flex items-center gap-2">
            <PhoneCall className="text-orange-500" size={24} /> Quản lý liên hệ
          </h1>
          <p className="text-xs text-gray-500 mt-1">
            Tổng số:{" "}
            <span className="font-bold text-[#113e48]">{filtered.length}</span>{" "}
            yêu cầu
          </p>
        </div>

        <div className="relative w-full sm:w-72">
          <Search
            className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"
            size={18}
          />
          <input
            type="text"
            placeholder="Tìm tên, email, nội dung..."
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
                <th className="px-6 py-4 w-1/3">Nội dung</th>
                <th className="px-6 py-4 text-center">Trạng thái</th>
                <th className="px-6 py-4 text-center">Người phụ trách</th>
                <th className="px-6 py-4 text-center">Thao tác</th>
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
              ) : currentContacts.length === 0 ? (
                <tr>
                  <td
                    colSpan="5"
                    className="px-6 py-12 text-center text-gray-400 italic"
                  >
                    Chưa có yêu cầu liên hệ nào.
                  </td>
                </tr>
              ) : (
                currentContacts.map((c) => (
                  <tr
                    key={c.id}
                    className="hover:bg-gray-50/50 transition-colors"
                  >
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        <div className="w-9 h-9 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center font-bold text-sm">
                          {c.name.charAt(0)}
                        </div>
                        <div>
                          <p className="font-bold text-[#113e48]">{c.name}</p>
                          <p className="text-xs text-gray-500">{c.email}</p>
                          {c.phone && (
                            <p className="text-xs text-gray-400 mt-0.5">
                              {c.phone}
                            </p>
                          )}
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <p
                        className="text-gray-700 line-clamp-2 text-xs leading-relaxed"
                        title={c.message}
                      >
                        {c.message}
                      </p>
                    </td>
                    <td className="px-6 py-4 text-center">
                      {getStatusBadge(c.status)}
                    </td>
                    <td className="px-6 py-4 text-center">
                      {c.assigned_name ? (
                        <span className="text-xs font-medium text-gray-700 bg-gray-100 px-2 py-1 rounded">
                          {c.assigned_name}
                        </span>
                      ) : (
                        <span className="text-xs text-gray-400 italic">
                          -- Chưa giao --
                        </span>
                      )}
                    </td>
                    <td className="px-6 py-4 text-center">
                      <div className="flex justify-center gap-2">
                        <button
                          onClick={() => {
                            setSelectedContact(c);
                            setShowDetailModal(true);
                          }}
                          className="p-2 text-gray-500 hover:bg-gray-100 rounded-lg transition-colors border border-gray-200 hover:border-gray-300"
                          title="Xem chi tiết"
                        >
                          <Eye size={16} />
                        </button>
                        {c.status === "pending" && (
                          <button
                            onClick={() => {
                              setSelectedContact(c);
                              setShowAssignModal(true);
                            }}
                            className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors border border-blue-100 hover:border-blue-200"
                            title="Giao việc"
                          >
                            <Send size={16} />
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        <Pagination
          currentPage={page}
          totalPages={totalPages}
          onPageChange={setPage}
        />
      </div>

      {/* 🧩 Modal Giao Điều Phối Viên */}
      {showAssignModal && (
        <div className="fixed inset-0 bg-black/40 flex justify-center items-center z-50 backdrop-blur-sm animate-in fade-in">
          <div className="bg-white p-6 rounded-2xl shadow-2xl w-full max-w-sm">
            <h2 className="text-lg font-bold text-[#113e48] text-center mb-1">
              Giao yêu cầu
            </h2>
            <p className="text-xs text-gray-500 text-center mb-6">
              Chọn nhân viên xử lý cho khách hàng{" "}
              <strong>{selectedContact?.name}</strong>
            </p>

            <div className="relative mb-6">
              <select
                className="w-full p-3 border rounded-lg text-sm bg-gray-50 outline-none focus:border-blue-500 appearance-none"
                value={selectedDispatcher}
                onChange={(e) => setSelectedDispatcher(e.target.value)}
              >
                <option value="">-- Chọn điều phối viên --</option>
                {dispatchers.map((d) => (
                  <option key={d.id} value={d.id}>
                    {d.name} ({d.email})
                  </option>
                ))}
              </select>
              <div className="absolute right-3 top-3.5 pointer-events-none text-gray-400 text-xs">
                ▼
              </div>
            </div>

            <div className="flex gap-3">
              <button
                onClick={() => setShowAssignModal(false)}
                className="flex-1 py-2.5 bg-gray-100 text-gray-600 rounded-lg text-sm font-bold hover:bg-gray-200"
              >
                Hủy
              </button>
              <button
                onClick={handleAssign}
                className="flex-1 py-2.5 bg-blue-600 text-white rounded-lg text-sm font-bold hover:bg-blue-700 shadow-lg"
              >
                Xác nhận giao
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 👁️ Modal Chi tiết */}
      {showDetailModal && (
        <div className="fixed inset-0 bg-black/40 flex justify-center items-center z-50 backdrop-blur-sm animate-in fade-in">
          <div className="bg-white p-0 rounded-2xl shadow-2xl w-full max-w-lg overflow-hidden">
            {/* Header */}
            <div className="bg-gray-50 px-6 py-4 border-b border-gray-100 flex justify-between items-center">
              <h2 className="text-lg font-bold text-[#113e48] flex items-center gap-2">
                <MessageSquare size={18} className="text-orange-500" /> Chi tiết
                liên hệ
              </h2>
              <button
                onClick={() => setShowDetailModal(false)}
                className="text-gray-400 hover:text-gray-600"
              >
                <XCircle size={20} />
              </button>
            </div>

            {/* Body */}
            <div className="p-6 space-y-4">
              <div className="flex items-start gap-4">
                <div className="w-10 h-10 rounded-full bg-blue-100 flex items-center justify-center text-blue-600 font-bold shrink-0">
                  {selectedContact?.name.charAt(0)}
                </div>
                <div>
                  <h3 className="font-bold text-gray-800">
                    {selectedContact?.name}
                  </h3>
                  <div className="flex items-center gap-2 text-xs text-gray-500 mt-1">
                    <Mail size={12} /> {selectedContact?.email}
                  </div>
                  {selectedContact?.phone && (
                    <div className="flex items-center gap-2 text-xs text-gray-500 mt-1">
                      <PhoneCall size={12} /> {selectedContact?.phone}
                    </div>
                  )}
                </div>
              </div>

              <div className="bg-gray-50 p-4 rounded-xl border border-gray-100">
                <label className="text-xs font-bold text-gray-400 uppercase mb-2 block">
                  Nội dung tin nhắn
                </label>
                <p className="text-sm text-gray-700 leading-relaxed whitespace-pre-wrap">
                  {selectedContact?.message}
                </p>
              </div>

              {/* Phần trạng thái và ghi chú - Đã tách 2 hàng */}
              <div className="flex flex-col gap-4 pt-4 border-t border-dashed mt-4">
                {/* Hàng 1: Trạng thái */}
                <div className="flex items-center gap-2 text-sm">
                  <span className="font-bold text-[#113e48]">
                    Trạng thái xử lý:
                  </span>
                  {getStatusBadge(selectedContact?.status)}
                </div>

                {/* Hàng 2: Ghi chú (nếu có) */}
                {selectedContact?.note && (
                  <div className="flex flex-col gap-1 bg-yellow-50 p-3 rounded-lg border border-yellow-100">
                    <span className="text-xs font-bold text-red-500 uppercase">
                      📝 Ghi chú:
                    </span>
                    <span className="text-sm text-gray-700 font-bold italic leading-relaxed">
                      "{selectedContact.note}"
                    </span>
                  </div>
                )}
              </div>
            </div>

            {/* Footer */}
            <div className="px-6 py-4 bg-gray-50 border-t border-gray-100 flex justify-end">
              <button
                onClick={() => setShowDetailModal(false)}
                className="px-6 py-2 bg-[#113e48] text-white rounded-lg text-sm font-bold hover:bg-[#0d2f36] shadow-md"
              >
                Đóng
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
