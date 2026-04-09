import { useEffect, useState } from "react";
import toast from "react-hot-toast";
import API from "../../services/api";
// Import component chọn địa chỉ (Đảm bảo đường dẫn đúng)
import DiaChiSelector from "../../components/DiaChiSelector";
import {
  Plus,
  Search,
  Edit2,
  Trash2,
  X,
  Package,
  MapPin,
  ChevronLeft,
  ChevronRight,
  Truck,
  User,
  Phone,
} from "lucide-react";
import Pagination from "../../components/Pagination";

export default function AdminShipments() {
  const [shipments, setShipments] = useState([]);
  const [filtered, setFiltered] = useState([]);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);

  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState(null);

  // Form state
  const [form, setForm] = useState({
    tracking_code: "",
    sender_name: "",
    sender_phone: "",
    receiver_name: "",
    receiver_phone: "",
    pickup_address: "",
    pickup_lat: null,
    pickup_lng: null,
    delivery_address: "",
    delivery_lat: null,
    delivery_lng: null,
    weight_kg: "",
    cod_amount: "",
    status: "pending",
  });

  const [page, setPage] = useState(1);
  const perPage = 8;
  const totalPages = Math.ceil(filtered.length / perPage);

  // 🔹 1. Fetch Data
  const fetchShipments = async () => {
    setLoading(true);
    try {
      const res = await API.get("/shipments");
      setShipments(res.data);
      setFiltered(res.data);
    } catch (err) {
      toast.error("Không thể tải danh sách đơn hàng");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchShipments();
  }, []);

  // 🔹 2. Filter Logic
  useEffect(() => {
    const keyword = search.toLowerCase();
    const filteredData = shipments.filter(
      (s) =>
        s.tracking_code?.toLowerCase().includes(keyword) ||
        s.sender_name?.toLowerCase().includes(keyword) ||
        s.receiver_name?.toLowerCase().includes(keyword) ||
        s.sender_phone?.includes(keyword)
    );
    setFiltered(filteredData);
    setPage(1);
  }, [search, shipments]);

  const handleChange = (e) =>
    setForm({ ...form, [e.target.name]: e.target.value });

  // 🔹 3. Xử lý khi chọn địa chỉ từ Component con
  const handlePickupAddressChange = (data) => {
    setForm((prev) => ({
      ...prev,
      pickup_address: data.address,
      pickup_lat: data.lat,
      pickup_lng: data.lng,
    }));
  };

  const handleDeliveryAddressChange = (data) => {
    setForm((prev) => ({
      ...prev,
      delivery_address: data.address,
      delivery_lat: data.lat,
      delivery_lng: data.lng,
    }));
  };

  // 🔹 4. Submit Form
  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      if (editing) {
        await API.put(`/shipments/${editing}`, form);
        toast.success("Đã cập nhật đơn hàng");
      } else {
        await API.post("/shipments", form);
        toast.success("Đã tạo đơn hàng mới");
      }
      setShowForm(false);
      setEditing(null);
      fetchShipments();
    } catch {
      toast.error("Lỗi xử lý yêu cầu");
    }
  };

  // 🔹 5. Delete Item
  const handleDelete = async (id) => {
    if (confirm("Xóa đơn hàng này khỏi hệ thống?")) {
      try {
        await API.delete(`/shipments/${id}`);
        toast.success("Đã xóa đơn hàng");
        fetchShipments();
      } catch {
        toast.error("Xóa thất bại");
      }
    }
  };

  const paginatedData = filtered.slice((page - 1) * perPage, page * perPage);

  // 🎨 Status Badge Helper (Việt hóa)
  const getStatusBadge = (status) => {
    const styles = {
      pending: "bg-yellow-100 text-yellow-800 border-yellow-200",
      assigned: "bg-sky-100 text-sky-800 border-sky-200",
      picking: "bg-purple-100 text-purple-800 border-purple-200",
      picked: "bg-indigo-100 text-indigo-800 border-indigo-200",
      delivering: "bg-blue-100 text-blue-800 border-blue-200",
      delivered: "bg-green-100 text-green-800 border-green-200",
      failed: "bg-red-100 text-red-800 border-red-200",
      canceled: "bg-gray-100 text-gray-800 border-gray-200",
    };

    const labels = {
      pending: "Chờ xử lý",
      assigned: "Đã điều phối",
      picking: "Đang lấy hàng",
      picked: "Đã lấy hàng",
      delivering: "Đang giao hàng",
      delivered: "Giao thành công",
      failed: "Giao thất bại",
      canceled: "Đã hủy",
    };

    return (
      <span
        className={`px-2.5 py-0.5 rounded-full text-xs font-bold border ${
          styles[status] || styles.canceled
        } whitespace-nowrap`}
      >
        {labels[status] || status}
      </span>
    );
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-500 font-sans">
      {/* --- HEADER --- */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-white p-5 rounded-xl border border-gray-100 shadow-sm">
        <div>
          <h1 className="text-xl font-bold text-[#113e48] flex items-center gap-2">
            <Package className="text-orange-500" size={24} /> Quản lý vận đơn
          </h1>
          <p className="text-xs text-gray-500 mt-1">
            Tổng số:{" "}
            <span className="font-bold text-[#113e48]">{filtered.length}</span>{" "}
            đơn hàng
          </p>
        </div>

        <div className="flex w-full sm:w-auto gap-3">
          <div className="relative flex-1 sm:w-72">
            <Search
              className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"
              size={18}
            />
            <input
              type="text"
              placeholder="Tìm theo mã, tên, SĐT..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-10 pr-4 py-2.5 bg-gray-50 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500 transition-all"
            />
          </div>
          <button
            onClick={() => {
              setForm({
                tracking_code: "",
                sender_name: "",
                sender_phone: "",
                receiver_name: "",
                receiver_phone: "",
                pickup_address: "",
                delivery_address: "",
                weight_kg: "",
                cod_amount: "",
                status: "pending",
              });
              setEditing(null);
              setShowForm(true);
            }}
            className="flex items-center gap-2 bg-[#113e48] hover:bg-[#0d2f36] text-white px-5 py-2.5 rounded-lg text-sm font-bold transition-colors shadow-lg shadow-blue-900/20"
          >
            <Plus size={18} /> <span className="hidden sm:inline">Tạo đơn</span>
          </button>
        </div>
      </div>

      {/* --- TABLE --- */}
      <div className="bg-white border border-gray-100 rounded-xl shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm text-left">
            <thead className="bg-gray-50 text-gray-500 font-medium border-b border-gray-100">
              <tr>
                <th className="px-6 py-4 whitespace-nowrap">Mã vận đơn</th>
                <th className="px-6 py-4 whitespace-nowrap">Người gửi</th>
                <th className="px-6 py-4 whitespace-nowrap">Người nhận</th>
                <th className="px-6 py-4 text-center whitespace-nowrap">
                  Trạng thái
                </th>
                <th className="px-6 py-4 text-right whitespace-nowrap">
                  COD (₫)
                </th>
                <th className="px-6 py-4 text-center whitespace-nowrap">
                  Thao tác
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {loading ? (
                [...Array(5)].map((_, i) => (
                  <tr key={i} className="animate-pulse">
                    <td className="px-6 py-4">
                      <div className="h-4 bg-gray-100 rounded w-24"></div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="h-4 bg-gray-100 rounded w-32 mb-2"></div>
                      <div className="h-3 bg-gray-50 rounded w-20"></div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="h-4 bg-gray-100 rounded w-32 mb-2"></div>
                      <div className="h-3 bg-gray-50 rounded w-20"></div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="h-6 bg-gray-100 rounded-full w-24 mx-auto"></div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="h-4 bg-gray-100 rounded w-16 ml-auto"></div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="h-8 bg-gray-100 rounded w-16 mx-auto"></div>
                    </td>
                  </tr>
                ))
              ) : paginatedData.length > 0 ? (
                paginatedData.map((s) => (
                  <tr
                    key={s.id}
                    className="hover:bg-gray-50/50 transition-colors group"
                  >
                    {/* Cột Mã */}
                    <td className="px-6 py-4">
                      <span className="font-bold text-[#113e48] text-base">
                        #{s.tracking_code}
                      </span>
                      <p className="text-[10px] text-gray-400 mt-1 flex items-center gap-1">
                        <Truck size={10} />{" "}
                        {new Date(s.created_at).toLocaleDateString("vi-VN")}
                      </p>
                    </td>

                    {/* Cột Gửi */}
                    <td className="px-6 py-4 max-w-[200px]">
                      <div className="flex items-center gap-2 mb-1">
                        <User size={14} className="text-gray-400" />
                        <span
                          className="font-medium text-gray-700 truncate"
                          title={s.sender_name}
                        >
                          {s.sender_name}
                        </span>
                      </div>
                      <div className="flex items-center gap-2 mb-1">
                        <Phone size={14} className="text-gray-400" />
                        <span className="text-xs text-gray-500">
                          {s.sender_phone}
                        </span>
                      </div>
                      <div className="flex items-start gap-2">
                        <MapPin
                          size={14}
                          className="text-orange-500 mt-0.5 shrink-0"
                        />
                        <span
                          className="text-xs text-gray-500 line-clamp-2"
                          title={s.pickup_address}
                        >
                          {s.pickup_address || "Kho trung tâm"}
                        </span>
                      </div>
                    </td>

                    {/* Cột Nhận */}
                    <td className="px-6 py-4 max-w-[200px]">
                      <div className="flex items-center gap-2 mb-1">
                        <User size={14} className="text-gray-400" />
                        <span
                          className="font-medium text-gray-700 truncate"
                          title={s.receiver_name}
                        >
                          {s.receiver_name}
                        </span>
                      </div>
                      <div className="flex items-center gap-2 mb-1">
                        <Phone size={14} className="text-gray-400" />
                        <span className="text-xs text-gray-500">
                          {s.receiver_phone}
                        </span>
                      </div>
                      <div className="flex items-start gap-2">
                        <MapPin
                          size={14}
                          className="text-blue-500 mt-0.5 shrink-0"
                        />
                        <span
                          className="text-xs text-gray-500 line-clamp-2"
                          title={s.delivery_address}
                        >
                          {s.delivery_address}
                        </span>
                      </div>
                    </td>

                    {/* Cột Trạng thái */}
                    <td className="px-6 py-4 text-center">
                      {getStatusBadge(s.status)}
                    </td>

                    {/* Cột COD */}
                    <td className="px-6 py-4 text-right">
                      <span className="font-bold text-[#113e48]">
                        {Number(s.cod_amount).toLocaleString("vi-VN")}
                      </span>
                      <span className="text-xs text-gray-400 ml-1">₫</span>
                    </td>

                    {/* Cột Thao tác */}
                    <td className="px-6 py-4 text-center">
                      <div className="flex items-center justify-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                        <button
                          onClick={() => {
                            setForm(s);
                            setEditing(s.id);
                            setShowForm(true);
                          }}
                          className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors border border-transparent hover:border-blue-100"
                          title="Chỉnh sửa"
                        >
                          <Edit2 size={16} />
                        </button>
                        <button
                          onClick={() => handleDelete(s.id)}
                          className="p-2 text-red-500 hover:bg-red-50 rounded-lg transition-colors border border-transparent hover:border-red-100"
                          title="Xóa"
                        >
                          <Trash2 size={16} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td
                    colSpan="6"
                    className="px-6 py-12 text-center text-gray-400 italic bg-gray-50/30"
                  >
                    <Package
                      size={48}
                      className="mx-auto text-gray-300 mb-2 opacity-50"
                    />
                    Không tìm thấy đơn hàng nào phù hợp.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {/* --- PAGINATION --- */}
        <Pagination
          currentPage={page}
          totalPages={totalPages}
          onPageChange={setPage}
        />
      </div>

      {/* --- MODAL FORM --- */}
      {showForm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-[#113e48]/50 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-3xl overflow-hidden animate-in zoom-in-95 duration-200 flex flex-col max-h-[90vh]">
            {/* Modal Header */}
            <div className="px-6 py-4 border-b border-gray-100 flex justify-between items-center bg-gray-50 shrink-0">
              <div>
                <h3 className="text-lg font-bold text-[#113e48]">
                  {editing ? "Cập nhật thông tin đơn hàng" : "Tạo đơn hàng mới"}
                </h3>
                <p className="text-xs text-gray-500">
                  Vui lòng điền đầy đủ thông tin bên dưới
                </p>
              </div>
              <button
                onClick={() => setShowForm(false)}
                className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-200 rounded-full transition-all"
              >
                <X size={20} />
              </button>
            </div>

            {/* Modal Body (Scrollable) */}
            <form
              onSubmit={handleSubmit}
              className="p-6 overflow-y-auto custom-scrollbar flex-1"
            >
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Cột Trái: Người Gửi */}
                <div className="space-y-4">
                  <div className="flex items-center gap-2 text-[#113e48] font-bold border-b pb-2 mb-2">
                    <div className="w-6 h-6 rounded-full bg-orange-100 text-orange-600 flex items-center justify-center text-xs">
                      1
                    </div>
                    Thông tin gửi
                  </div>

                  <div>
                    <label className="text-xs font-semibold text-gray-500 mb-1 block">
                      Mã vận đơn (Tùy chọn)
                    </label>
                    <input
                      name="tracking_code"
                      placeholder="Để trống sẽ tự động tạo"
                      value={form.tracking_code}
                      onChange={handleChange}
                      className="w-full p-2.5 border rounded-lg text-sm bg-gray-50 focus:bg-white focus:ring-2 focus:ring-orange-500/20 outline-none transition-all"
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="text-xs font-semibold text-gray-500 mb-1 block">
                        Tên người gửi <span className="text-red-500">*</span>
                      </label>
                      <input
                        name="sender_name"
                        value={form.sender_name}
                        onChange={handleChange}
                        className="w-full p-2.5 border rounded-lg text-sm focus:ring-2 focus:ring-orange-500/20 outline-none"
                        required
                      />
                    </div>
                    <div>
                      <label className="text-xs font-semibold text-gray-500 mb-1 block">
                        SĐT gửi <span className="text-red-500">*</span>
                      </label>
                      <input
                        name="sender_phone"
                        value={form.sender_phone}
                        onChange={handleChange}
                        className="w-full p-2.5 border rounded-lg text-sm focus:ring-2 focus:ring-orange-500/20 outline-none"
                        required
                      />
                    </div>
                  </div>

                  {/* COMPONENT ĐỊA CHỈ (GỬI) */}
                  <DiaChiSelector
                    label="Địa chỉ lấy hàng"
                    onChange={handlePickupAddressChange}
                    // Nếu đang edit thì có thể truyền giá trị cũ vào (cần update component con hỗ trợ defaultValue nếu muốn hiển thị lại)
                  />
                  {/* Fallback input nếu component lỗi hoặc muốn sửa tay */}
                  <input
                    name="pickup_address"
                    placeholder="Chi tiết số nhà/đường..."
                    value={form.pickup_address}
                    onChange={handleChange}
                    className="w-full p-2.5 border rounded-lg text-sm focus:ring-2 focus:ring-orange-500/20 outline-none mt-2"
                  />
                </div>

                {/* Cột Phải: Người Nhận */}
                <div className="space-y-4">
                  <div className="flex items-center gap-2 text-[#113e48] font-bold border-b pb-2 mb-2">
                    <div className="w-6 h-6 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center text-xs">
                      2
                    </div>
                    Thông tin nhận
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="text-xs font-semibold text-gray-500 mb-1 block">
                        Tên người nhận <span className="text-red-500">*</span>
                      </label>
                      <input
                        name="receiver_name"
                        value={form.receiver_name}
                        onChange={handleChange}
                        className="w-full p-2.5 border rounded-lg text-sm focus:ring-2 focus:ring-blue-500/20 outline-none"
                        required
                      />
                    </div>
                    <div>
                      <label className="text-xs font-semibold text-gray-500 mb-1 block">
                        SĐT nhận <span className="text-red-500">*</span>
                      </label>
                      <input
                        name="receiver_phone"
                        value={form.receiver_phone}
                        onChange={handleChange}
                        className="w-full p-2.5 border rounded-lg text-sm focus:ring-2 focus:ring-blue-500/20 outline-none"
                        required
                      />
                    </div>
                  </div>

                  {/* COMPONENT ĐỊA CHỈ (NHẬN) */}
                  <DiaChiSelector
                    label="Địa chỉ giao hàng"
                    onChange={handleDeliveryAddressChange}
                  />
                  <input
                    name="delivery_address"
                    placeholder="Chi tiết số nhà/đường..."
                    value={form.delivery_address}
                    onChange={handleChange}
                    className="w-full p-2.5 border rounded-lg text-sm focus:ring-2 focus:ring-blue-500/20 outline-none mt-2"
                  />
                </div>
              </div>

              {/* Thông tin hàng hóa (Full width) */}
              <div className="mt-6 pt-4 border-t border-dashed border-gray-200">
                <div className="flex items-center gap-2 text-[#113e48] font-bold mb-4">
                  <div className="w-6 h-6 rounded-full bg-green-100 text-green-600 flex items-center justify-center text-xs">
                    3
                  </div>
                  Chi tiết kiện hàng
                </div>

                <div className="grid grid-cols-3 gap-4">
                  <div>
                    <label className="text-xs font-semibold text-gray-500 mb-1 block">
                      Khối lượng (kg)
                    </label>
                    <div className="relative">
                      <input
                        type="number"
                        name="weight_kg"
                        value={form.weight_kg}
                        onChange={handleChange}
                        className="w-full p-2.5 border rounded-lg text-sm pr-8"
                      />
                      <span className="absolute right-3 top-2.5 text-xs text-gray-400">
                        kg
                      </span>
                    </div>
                  </div>
                  <div>
                    <label className="text-xs font-semibold text-gray-500 mb-1 block">
                      Tiền thu hộ (COD)
                    </label>
                    <div className="relative">
                      <input
                        type="number"
                        name="cod_amount"
                        value={form.cod_amount}
                        onChange={handleChange}
                        className="w-full p-2.5 border rounded-lg text-sm pr-8 font-bold text-[#113e48]"
                      />
                      <span className="absolute right-3 top-2.5 text-xs text-gray-400">
                        đ
                      </span>
                    </div>
                  </div>
                  <div>
                    <label className="text-xs font-semibold text-gray-500 mb-1 block">
                      Trạng thái
                    </label>
                    <select
                      name="status"
                      value={form.status}
                      onChange={handleChange}
                      className="w-full p-2.5 border rounded-lg text-sm bg-white cursor-pointer hover:border-orange-300 transition-colors"
                    >
                      <option value="pending">🟡 Chờ xử lý</option>
                      <option value="assigned">🔵 Đã điều phối</option>
                      <option value="picking">🟣 Đang lấy hàng</option>
                      <option value="picked">🚚 Đã lấy hàng</option>
                      <option value="delivering">🚀 Đang giao hàng</option>
                      <option value="delivered">✅ Giao thành công</option>
                      <option value="failed">❌ Giao thất bại</option>
                      <option value="canceled">🚫 Đã hủy</option>
                    </select>
                  </div>
                </div>
              </div>
            </form>

            {/* Modal Footer */}
            <div className="px-6 py-4 border-t border-gray-100 flex justify-end gap-3 bg-gray-50 shrink-0">
              <button
                type="button"
                onClick={() => setShowForm(false)}
                className="px-5 py-2.5 text-sm font-bold text-gray-600 bg-white border border-gray-300 rounded-lg hover:bg-gray-100 transition-all active:scale-95"
              >
                Hủy bỏ
              </button>
              <button
                onClick={handleSubmit}
                className="px-5 py-2.5 text-sm font-bold text-white bg-gradient-to-r from-orange-500 to-orange-600 rounded-lg hover:from-orange-600 hover:to-orange-700 shadow-lg shadow-orange-500/30 transition-all active:scale-95 flex items-center gap-2"
              >
                {editing ? <Edit2 size={16} /> : <Plus size={16} />}
                {editing ? "Lưu thay đổi" : "Tạo đơn hàng"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
