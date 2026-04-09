import { useEffect, useState } from "react";
import API from "../../services/api";
import toast from "react-hot-toast";
import {
  Users,
  Search,
  Plus,
  Edit2,
  Trash2,
  Truck,
  CheckCircle,
  XCircle,
  FileText,
  Phone,
  Mail,
  Car,
} from "lucide-react";
// 👇 Import Component Pagination
import Pagination from "../../components/Pagination";

export default function AdminDrivers() {
  const [tab, setTab] = useState("drivers"); // drivers | vehicles | applications

  // --- DATA STATE ---
  const [drivers, setDrivers] = useState([]);
  const [filteredDrivers, setFilteredDrivers] = useState([]);

  const [vehicles, setVehicles] = useState([]);
  const [filteredVehicles, setFilteredVehicles] = useState([]);

  const [applications, setApplications] = useState([]);

  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);

  // --- PAGINATION STATE ---
  const itemsPerPage = 8;
  const [driverPage, setDriverPage] = useState(1);
  const [vehiclePage, setVehiclePage] = useState(1);

  // --- FORM STATE ---
  const [showDriverForm, setShowDriverForm] = useState(false);
  const [editingDriver, setEditingDriver] = useState(null);
  const [driverForm, setDriverForm] = useState({
    name: "",
    email: "",
    phone: "",
    status: "available",
  });

  const [showVehicleForm, setShowVehicleForm] = useState(false);
  const [editingVehicle, setEditingVehicle] = useState(null);
  const [vehicleForm, setVehicleForm] = useState({
    plate_no: "",
    type: "Motorcycle",
    capacity: "",
    status: "available",
  });

  const [showAssignModal, setShowAssignModal] = useState(false);
  const [selectedDriverId, setSelectedDriverId] = useState(null);
  const [selectedVehicleId, setSelectedVehicleId] = useState("");

  // ==========================
  // 1. FETCH DATA
  // ==========================
  const fetchDrivers = async () => {
    try {
      const res = await API.get("/drivers");
      setDrivers(res.data);
      setFilteredDrivers(res.data);
    } catch {
      toast.error("Lỗi tải danh sách tài xế");
    }
  };

  const fetchVehicles = async () => {
    try {
      const res = await API.get("/vehicles");
      setVehicles(res.data);
      setFilteredVehicles(res.data);
    } catch {
      toast.error("Lỗi tải danh sách xe");
    }
  };

  const fetchApplications = async () => {
    try {
      const res = await API.get("/drivers/applications");
      setApplications(res.data);
    } catch {
      toast.error("Lỗi tải hồ sơ");
    }
  };

  useEffect(() => {
    const loadData = async () => {
      setLoading(true);
      await Promise.all([fetchDrivers(), fetchVehicles(), fetchApplications()]);
      setLoading(false);
    };
    loadData();
  }, []);

  // Filter Logic
  useEffect(() => {
    const keyword = search.toLowerCase();

    if (tab === "drivers") {
      const result = drivers.filter(
        (d) =>
          d?.name?.toLowerCase().includes(keyword) ||
          d?.email?.toLowerCase().includes(keyword)
      );
      setFilteredDrivers(result);
      setDriverPage(1);
    } else if (tab === "vehicles") {
      const result = vehicles.filter(
        (v) =>
          v?.plate_no?.toLowerCase().includes(keyword) ||
          v?.type?.toLowerCase().includes(keyword)
      );
      setFilteredVehicles(result);
      setVehiclePage(1);
    }
  }, [search, drivers, vehicles, tab]);

  // ==========================
  // 2. HANDLERS
  // ==========================

  // --- DRIVER ---
  const handleSaveDriver = async (e) => {
    e.preventDefault();
    try {
      if (editingDriver) {
        await API.put(`/drivers/${editingDriver}`, driverForm);
        toast.success("Cập nhật tài xế thành công");
      } else {
        await API.post("/drivers", driverForm);
        toast.success("Thêm tài xế mới thành công");
      }
      setShowDriverForm(false);
      fetchDrivers();
    } catch {
      toast.error("Lỗi lưu tài xế");
    }
  };

  const handleDeleteDriver = async (id) => {
    if (confirm("Xóa tài xế này khỏi hệ thống?")) {
      try {
        await API.delete(`/drivers/${id}`);
        toast.success("Đã xóa tài xế");
        fetchDrivers();
      } catch {
        toast.error("Xóa thất bại");
      }
    }
  };

  const handleStatusChange = async (id, status) => {
    try {
      await API.patch(`/drivers/${id}/status`, { status });
      toast.success("Cập nhật trạng thái xong");
      fetchDrivers();
    } catch {
      toast.error("Lỗi cập nhật");
    }
  };

  // --- VEHICLE ---
  const handleSaveVehicle = async (e) => {
    e.preventDefault();
    try {
      if (editingVehicle) {
        await API.put(`/vehicles/${editingVehicle}`, vehicleForm);
        toast.success("Cập nhật phương tiện thành công");
      } else {
        await API.post("/vehicles", vehicleForm);
        toast.success("Thêm phương tiện mới thành công");
      }
      setShowVehicleForm(false);
      fetchVehicles();
    } catch (err) {
      toast.error(err.response?.data?.message || "Lỗi lưu phương tiện");
    }
  };

  const handleDeleteVehicle = async (id) => {
    if (confirm("Xóa phương tiện này?")) {
      try {
        await API.delete(`/vehicles/${id}`);
        toast.success("Đã xóa phương tiện");
        fetchVehicles();
      } catch (err) {
        toast.error(err.response?.data?.message || "Xóa thất bại");
      }
    }
  };

  // --- ASSIGN & APPROVE ---
  const handleAssignVehicle = async () => {
    if (!selectedVehicleId) return toast.error("Vui lòng chọn xe!");
    try {
      await API.put(`/drivers/${selectedDriverId}/vehicle`, {
        vehicle_id: selectedVehicleId,
      });
      toast.success("Gán xe thành công");
      setShowAssignModal(false);
      setSelectedVehicleId("");
      fetchDrivers();
      fetchVehicles();
    } catch {
      toast.error("Lỗi gán xe");
    }
  };

  const approveApplication = async (id) => {
    if (!confirm("Duyệt hồ sơ này?")) return;
    try {
      await API.post(`/drivers/applications/${id}/approve`);
      toast.success("Đã duyệt hồ sơ");
      fetchApplications();
      fetchDrivers();
    } catch {
      toast.error("Lỗi duyệt hồ sơ");
    }
  };

  // ==========================
  // 3. HELPERS
  // ==========================
  const getVehicleBadge = (status) => {
    const map = {
      available: { label: "Sẵn sàng", color: "bg-green-100 text-green-700" },
      busy: { label: "Đang sử dụng", color: "bg-blue-100 text-blue-700" },
      maintenance: { label: "Bảo trì", color: "bg-red-100 text-red-700" },
    };
    const s = map[status] || map.available;
    return (
      <span
        className={`px-2.5 py-0.5 rounded-full text-xs font-bold ${s.color}`}
      >
        {s.label}
      </span>
    );
  };

  // Pagination Data Calculation
  const currentDrivers = filteredDrivers.slice(
    (driverPage - 1) * itemsPerPage,
    driverPage * itemsPerPage
  );
  const totalDriverPages = Math.ceil(filteredDrivers.length / itemsPerPage);

  const currentVehicles = filteredVehicles.slice(
    (vehiclePage - 1) * itemsPerPage,
    vehiclePage * itemsPerPage
  );
  const totalVehiclePages = Math.ceil(filteredVehicles.length / itemsPerPage);

  return (
    <div className="space-y-6 animate-in fade-in duration-500 font-sans">
      {/* HEADER TABS */}
      <div className="bg-white p-2 rounded-xl shadow-sm border border-gray-100 flex flex-wrap gap-2 w-fit">
        <button
          onClick={() => {
            setTab("drivers");
            setSearch("");
          }}
          className={`px-5 py-2.5 rounded-lg text-sm font-bold transition-all flex items-center gap-2 ${
            tab === "drivers"
              ? "bg-[#113e48] text-white shadow-md"
              : "text-gray-500 hover:bg-gray-100"
          }`}
        >
          <Users size={18} /> Tài xế
        </button>
        <button
          onClick={() => {
            setTab("vehicles");
            setSearch("");
          }}
          className={`px-5 py-2.5 rounded-lg text-sm font-bold transition-all flex items-center gap-2 ${
            tab === "vehicles"
              ? "bg-[#113e48] text-white shadow-md"
              : "text-gray-500 hover:bg-gray-100"
          }`}
        >
          <Car size={18} /> Phương tiện
        </button>
        <button
          onClick={() => {
            setTab("applications");
            setSearch("");
          }}
          className={`px-5 py-2.5 rounded-lg text-sm font-bold transition-all flex items-center gap-2 ${
            tab === "applications"
              ? "bg-[#113e48] text-white shadow-md"
              : "text-gray-500 hover:bg-gray-100"
          }`}
        >
          <FileText size={18} /> Hồ sơ (
          {applications.filter((a) => a.status === "pending").length})
        </button>
      </div>

      {/* MAIN CONTENT */}
      <div className="bg-white border border-gray-100 rounded-xl shadow-sm overflow-hidden">
        {/* === TAB 1: DRIVERS === */}
        {tab === "drivers" && (
          <>
            <div className="p-5 border-b border-gray-100 flex flex-col sm:flex-row justify-between items-center gap-4 bg-gray-50/50">
              <div className="relative w-full sm:w-72">
                <Search
                  className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"
                  size={18}
                />
                <input
                  type="text"
                  placeholder="Tìm tài xế..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="w-full pl-10 pr-4 py-2.5 bg-white border border-gray-200 rounded-lg text-sm outline-none focus:border-orange-500"
                />
              </div>
              <button
                onClick={() => {
                  setDriverForm({
                    name: "",
                    email: "",
                    phone: "",
                    status: "available",
                  });
                  setEditingDriver(null);
                  setShowDriverForm(true);
                }}
                className="flex items-center gap-2 bg-orange-500 hover:bg-orange-600 text-white px-4 py-2.5 rounded-lg text-sm font-bold shadow-md"
              >
                <Plus size={18} /> Thêm tài xế
              </button>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-sm text-left">
                <thead className="bg-gray-50 text-gray-500 font-medium border-b border-gray-100">
                  <tr>
                    <th className="px-6 py-4">Tài xế</th>
                    <th className="px-6 py-4">Liên hệ</th>
                    <th className="px-6 py-4">Xe đang chạy</th>
                    <th className="px-6 py-4 text-center">Trạng thái</th>
                    <th className="px-6 py-4 text-center">Thao tác</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {currentDrivers.map((d) => (
                    <tr
                      key={d.id}
                      className="hover:bg-gray-50/50 transition-colors"
                    >
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center font-bold text-lg">
                            {d.name.charAt(0)}
                          </div>
                          <div>
                            <p className="font-bold text-[#113e48]">{d.name}</p>
                            <p className="text-xs text-gray-400">ID: #{d.id}</p>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4 space-y-1">
                        <div className="flex items-center gap-2 text-xs text-gray-600">
                          <Mail size={14} /> {d.email}
                        </div>
                        <div className="flex items-center gap-2 text-xs text-gray-600">
                          <Phone size={14} /> {d.phone}
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        {d.plate_no ? (
                          <span className="flex items-center gap-2 bg-gray-100 px-3 py-1.5 rounded-lg w-fit text-xs font-medium border border-gray-200">
                            <Car size={14} className="text-gray-500" />{" "}
                            {d.plate_no}
                          </span>
                        ) : (
                          <button
                            onClick={() => {
                              setSelectedDriverId(d.id);
                              setShowAssignModal(true);
                            }}
                            className="text-xs text-orange-500 hover:underline flex items-center gap-1 font-medium"
                          >
                            <Plus size={12} /> Gán xe
                          </button>
                        )}
                      </td>
                      <td className="px-6 py-4 text-center">
                        <select
                          value={d.status}
                          onChange={(e) =>
                            handleStatusChange(d.id, e.target.value)
                          }
                          className="bg-transparent text-xs font-bold border-none outline-none cursor-pointer text-gray-700"
                        >
                          <option value="available">🟢 Sẵn sàng</option>
                          <option value="delivering">🔵 Đang giao</option>
                          <option value="inactive">⚪ Tạm nghỉ</option>
                        </select>
                      </td>
                      <td className="px-6 py-4 text-center">
                        <div className="flex justify-center gap-2">
                          <button
                            onClick={() => {
                              setDriverForm(d);
                              setEditingDriver(d.id);
                              setShowDriverForm(true);
                            }}
                            className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg"
                          >
                            <Edit2 size={16} />
                          </button>
                          <button
                            onClick={() => handleDeleteDriver(d.id)}
                            className="p-2 text-red-500 hover:bg-red-50 rounded-lg"
                          >
                            <Trash2 size={16} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* 👇 SỬ DỤNG COMPONENT PHÂN TRANG 👇 */}
            <Pagination
              currentPage={driverPage}
              totalPages={totalDriverPages}
              onPageChange={setDriverPage}
            />
          </>
        )}

        {/* === TAB 2: VEHICLES === */}
        {tab === "vehicles" && (
          <>
            <div className="p-5 border-b border-gray-100 flex flex-col sm:flex-row justify-between items-center gap-4 bg-gray-50/50">
              <div className="relative w-full sm:w-72">
                <Search
                  className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"
                  size={18}
                />
                <input
                  type="text"
                  placeholder="Tìm biển số, loại xe..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="w-full pl-10 pr-4 py-2.5 bg-white border border-gray-200 rounded-lg text-sm outline-none focus:border-orange-500"
                />
              </div>
              <button
                onClick={() => {
                  setVehicleForm({
                    plate_no: "",
                    type: "Motorcycle",
                    capacity: "",
                    status: "available",
                  });
                  setEditingVehicle(null);
                  setShowVehicleForm(true);
                }}
                className="flex items-center gap-2 bg-green-600 hover:bg-green-700 text-white px-4 py-2.5 rounded-lg text-sm font-bold shadow-md"
              >
                <Plus size={18} /> Thêm xe mới
              </button>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-sm text-left">
                <thead className="bg-gray-50 text-gray-500 font-medium border-b border-gray-100">
                  <tr>
                    <th className="px-6 py-4">Biển số</th>
                    <th className="px-6 py-4">Loại xe</th>
                    <th className="px-6 py-4">Tải trọng (kg)</th>
                    <th className="px-6 py-4 text-center">Trạng thái</th>
                    <th className="px-6 py-4 text-center">Thao tác</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {currentVehicles.length === 0 ? (
                    <tr>
                      <td colSpan="5" className="p-8 text-center text-gray-400">
                        Chưa có phương tiện nào
                      </td>
                    </tr>
                  ) : (
                    currentVehicles.map((v) => (
                      <tr
                        key={v.id}
                        className="hover:bg-gray-50/50 transition-colors"
                      >
                        <td className="px-6 py-4 font-bold text-[#113e48] uppercase">
                          {v.plate_no}
                        </td>
                        <td className="px-6 py-4">
                          <div className="flex items-center gap-2">
                            {v.type === "Truck" ? (
                              <Truck size={16} className="text-gray-500" />
                            ) : (
                              <Car size={16} className="text-gray-500" />
                            )}
                            {v.type}
                          </div>
                        </td>
                        <td className="px-6 py-4 text-gray-600 font-medium">
                          {v.capacity || v.capacity_kg || "0"}
                        </td>
                        <td className="px-6 py-4 text-center">
                          {getVehicleBadge(v.status)}
                        </td>
                        <td className="px-6 py-4 text-center">
                          <div className="flex justify-center gap-2">
                            <button
                              onClick={() => {
                                setVehicleForm(v);
                                setEditingVehicle(v.id);
                                setShowVehicleForm(true);
                              }}
                              className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg"
                            >
                              <Edit2 size={16} />
                            </button>
                            <button
                              onClick={() => handleDeleteVehicle(v.id)}
                              className="p-2 text-red-500 hover:bg-red-50 rounded-lg"
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

            {/* 👇 SỬ DỤNG COMPONENT PHÂN TRANG 👇 */}
            <Pagination
              currentPage={vehiclePage}
              totalPages={totalVehiclePages}
              onPageChange={setVehiclePage}
            />
          </>
        )}

        {/* === TAB 3: APPLICATIONS === */}
        {tab === "applications" && (
          <div className="overflow-x-auto">
            <table className="w-full text-sm text-left">
              <thead className="bg-gray-50 text-gray-500 font-medium border-b border-gray-100">
                <tr>
                  <th className="px-6 py-4">Ứng viên</th>
                  <th className="px-6 py-4">Phương tiện đăng ký</th>
                  <th className="px-6 py-4 text-center">Trạng thái</th>
                  <th className="px-6 py-4 text-center">Thao tác</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {applications.map((app) => (
                  <tr
                    key={app.id}
                    className="hover:bg-gray-50/50 transition-colors"
                  >
                    <td className="px-6 py-4">
                      <p className="font-bold text-[#113e48]">{app.name}</p>
                      <p className="text-xs text-gray-500">
                        {app.email} • {app.phone}
                      </p>
                    </td>
                    <td className="px-6 py-4">
                      <p className="font-medium text-gray-700">
                        {app.vehicle_type}
                      </p>
                      <p className="text-xs text-gray-500 bg-gray-100 px-2 py-0.5 rounded w-fit mt-1">
                        {app.license_plate}
                      </p>
                    </td>
                    <td className="px-6 py-4 text-center">
                      {app.status === "pending" && (
                        <span className="bg-yellow-100 text-yellow-700 px-2 py-1 rounded text-xs font-bold">
                          Chờ duyệt
                        </span>
                      )}
                      {app.status === "approved" && (
                        <span className="bg-green-100 text-green-700 px-2 py-1 rounded text-xs font-bold">
                          Đã duyệt
                        </span>
                      )}
                      {app.status === "rejected" && (
                        <span className="bg-red-100 text-red-700 px-2 py-1 rounded text-xs font-bold">
                          Từ chối
                        </span>
                      )}
                    </td>
                    <td className="px-6 py-4 text-center">
                      {app.status === "pending" && (
                        <div className="flex justify-center gap-2">
                          <button
                            onClick={() => approveApplication(app.id)}
                            className="flex items-center gap-1 bg-green-500 hover:bg-green-600 text-white px-3 py-1.5 rounded-lg text-xs font-bold shadow-md"
                          >
                            <CheckCircle size={14} /> Duyệt
                          </button>
                          <button
                            onClick={() => alert("Từ chối")}
                            className="flex items-center gap-1 bg-red-100 hover:bg-red-200 text-red-600 px-3 py-1.5 rounded-lg text-xs font-bold"
                          >
                            <XCircle size={14} /> Hủy
                          </button>
                        </div>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* === MODALS (Giữ nguyên phần Modal) === */}
      {/* ... Phần Modal Driver, Vehicle, AssignModal giữ nguyên như code cũ ... */}
      {showDriverForm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm">
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-md p-6">
            <h3 className="text-xl font-bold text-[#113e48] mb-4 text-center">
              {editingDriver ? "Sửa tài xế" : "Thêm tài xế mới"}
            </h3>
            <form onSubmit={handleSaveDriver} className="space-y-3">
              <input
                placeholder="Họ tên"
                value={driverForm.name}
                onChange={(e) =>
                  setDriverForm({ ...driverForm, name: e.target.value })
                }
                className="w-full p-3 border rounded-lg text-sm outline-none focus:border-orange-500"
                required
              />
              <input
                placeholder="Email"
                value={driverForm.email}
                onChange={(e) =>
                  setDriverForm({ ...driverForm, email: e.target.value })
                }
                className="w-full p-3 border rounded-lg text-sm outline-none focus:border-orange-500"
                required
              />
              <input
                placeholder="Số điện thoại"
                value={driverForm.phone}
                onChange={(e) =>
                  setDriverForm({ ...driverForm, phone: e.target.value })
                }
                className="w-full p-3 border rounded-lg text-sm outline-none focus:border-orange-500"
                required
              />
              <div className="flex gap-3 mt-6">
                <button
                  type="button"
                  onClick={() => setShowDriverForm(false)}
                  className="flex-1 py-2.5 bg-gray-100 text-gray-600 rounded-lg text-sm font-bold"
                >
                  Hủy
                </button>
                <button
                  type="submit"
                  className="flex-1 py-2.5 bg-orange-500 text-white rounded-lg text-sm font-bold shadow-lg"
                >
                  Lưu
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {showVehicleForm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm">
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-md p-6">
            <div className="flex items-center justify-center gap-2 mb-4">
              <div className="bg-green-100 p-2 rounded-full">
                <Car className="text-green-600" size={24} />
              </div>
              <h3 className="text-xl font-bold text-[#113e48]">
                {editingVehicle ? "Cập nhật phương tiện" : "Thêm xe mới"}
              </h3>
            </div>
            <form onSubmit={handleSaveVehicle} className="space-y-4">
              <div>
                <label className="text-xs font-bold text-gray-500 uppercase">
                  Biển số xe
                </label>
                <input
                  value={vehicleForm.plate_no}
                  onChange={(e) =>
                    setVehicleForm({
                      ...vehicleForm,
                      plate_no: e.target.value,
                    })
                  }
                  className="w-full p-3 border rounded-lg text-sm font-bold uppercase tracking-widest outline-none focus:border-green-500"
                  placeholder="VD: 29A-12345"
                  required
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-xs font-bold text-gray-500 uppercase">
                    Loại xe
                  </label>
                  <select
                    value={vehicleForm.type}
                    onChange={(e) =>
                      setVehicleForm({ ...vehicleForm, type: e.target.value })
                    }
                    className="w-full p-3 border rounded-lg text-sm bg-white outline-none"
                  >
                    <option value="Motorcycle">Xe máy</option>
                    <option value="Truck">Xe tải</option>
                    <option value="Van">Xe bán tải</option>
                  </select>
                </div>
                <div>
                  <label className="text-xs font-bold text-gray-500 uppercase">
                    Tải trọng (kg)
                  </label>
                  <input
                    type="number"
                    value={vehicleForm.capacity}
                    onChange={(e) =>
                      setVehicleForm({
                        ...vehicleForm,
                        capacity: e.target.value,
                      })
                    }
                    className="w-full p-3 border rounded-lg text-sm outline-none"
                    placeholder="VD: 500"
                  />
                </div>
              </div>
              <div>
                <label className="text-xs font-bold text-gray-500 uppercase">
                  Trạng thái
                </label>
                <select
                  value={vehicleForm.status}
                  onChange={(e) =>
                    setVehicleForm({ ...vehicleForm, status: e.target.value })
                  }
                  className="w-full p-3 border rounded-lg text-sm bg-white outline-none"
                >
                  <option value="available">🟢 Sẵn sàng</option>
                  <option value="busy">🔴 Đang sử dụng</option>
                  <option value="maintenance">🟠 Bảo trì</option>
                </select>
              </div>

              <div className="flex gap-3 mt-6">
                <button
                  type="button"
                  onClick={() => setShowVehicleForm(false)}
                  className="flex-1 py-2.5 bg-gray-100 text-gray-600 rounded-lg text-sm font-bold"
                >
                  Hủy
                </button>
                <button
                  type="submit"
                  className="flex-1 py-2.5 bg-green-600 text-white rounded-lg text-sm font-bold shadow-lg hover:bg-green-700"
                >
                  Lưu thông tin
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {showAssignModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm">
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-sm p-6 text-center">
            <h3 className="text-lg font-bold text-[#113e48] mb-1">
              Gán xe cho tài xế
            </h3>
            <p className="text-xs text-gray-500 mb-6">
              Chọn phương tiện từ danh sách xe rảnh
            </p>

            <select
              className="w-full p-3 border rounded-lg text-sm mb-6 bg-gray-50 outline-none focus:border-blue-500"
              value={selectedVehicleId}
              onChange={(e) => setSelectedVehicleId(e.target.value)}
            >
              <option value="">-- Chọn xe --</option>
              {vehicles
                .filter((v) => v.status === "available")
                .map((v) => (
                  <option key={v.id} value={v.id}>
                    {v.plate_no} ({v.type})
                  </option>
                ))}
            </select>

            <div className="flex gap-3">
              <button
                onClick={() => setShowAssignModal(false)}
                className="flex-1 py-2.5 bg-gray-100 text-gray-600 rounded-lg text-sm font-bold"
              >
                Đóng
              </button>
              <button
                onClick={handleAssignVehicle}
                className="flex-1 py-2.5 bg-blue-600 text-white rounded-lg text-sm font-bold shadow-lg"
              >
                Xác nhận
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
