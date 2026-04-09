import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import API from "../../services/api";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  LineChart,
  Line,
  CartesianGrid,
  Legend,
} from "recharts";
import {
  Package,
  Truck,
  Users,
  DollarSign,
  TrendingUp,
  Activity,
  Award,
} from "lucide-react";

export default function AdminDashboard() {
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);

  const fetchStats = async () => {
    try {
      // Giả lập delay để test loading
      // await new Promise(resolve => setTimeout(resolve, 1000));
      const res = await API.get("/admin/stats");
      setStats(res.data);
    } catch (error) {
      console.error("Error fetching stats:", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchStats();
  }, []);

  if (loading) return <DashboardSkeleton />;
  if (!stats)
    return (
      <div className="p-8 text-center text-gray-500">
        Không có dữ liệu thống kê.
      </div>
    );

  // Hàm format tiền tệ: 100.000.000 VNĐ
  const formatCurrency = (value) => {
    return new Intl.NumberFormat("vi-VN").format(value) + " VNĐ";
  };

  // Xử lý dữ liệu biểu đồ
  const shipmentData = stats.shipmentStats.map((s) => ({
    name:
      s.status === "pending"
        ? "Chờ xử lý"
        : s.status === "processing"
        ? "Đang xử lý"
        : s.status === "delivering"
        ? "Đang giao"
        : s.status === "delivered"
        ? "Đã giao"
        : s.status === "failed"
        ? "Thất bại"
        : "Khác",
    value: s.count,
    fill:
      s.status === "delivered"
        ? "#10B981" // Xanh lá
        : s.status === "failed"
        ? "#EF4444" // Đỏ
        : s.status === "delivering"
        ? "#3B82F6" // Xanh dương
        : "#F59E0B", // Cam/Vàng
  }));

  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-extrabold text-[#113e48] flex items-center gap-2">
          <Activity className="text-orange-500" /> Tổng quan hệ thống
        </h1>
        <p className="text-sm text-gray-500 mt-1">
          Cập nhật số liệu kinh doanh mới nhất hôm nay.
        </p>
      </div>

      {/* 1. Thống kê nhanh (Stats Cards) */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        <StatCard
          title="Tổng đơn hàng"
          value={stats.totalShipments}
          icon={<Package size={24} className="text-white" />}
          color="bg-blue-500"
          trend="+12%"
          to="/admin/shipments" // 👈 Link tới Quản lý đơn hàng
        />
        <StatCard
          title="Tổng tài xế"
          value={stats.totalDrivers}
          icon={<Truck size={24} className="text-white" />}
          color="bg-orange-500"
          trend="+5%"
          to="/admin/drivers" // 👈 Link tới Quản lý tài xế
        />
        <StatCard
          title="Khách hàng"
          value={stats.totalCustomers}
          icon={<Users size={24} className="text-white" />}
          color="bg-purple-500"
          trend="+8%"
          to="/admin/customers" // 👈 Link tới Quản lý khách hàng
        />
        <StatCard
          title="Doanh thu"
          value={formatCurrency(stats.totalRevenue)}
          icon={<DollarSign size={24} className="text-white" />}
          color="bg-green-500"
          trend="+20%"
          to="/admin/payments" // 👈 Link tới Quản lý thanh toán/doanh thu
        />
      </div>
      {/* 2. Biểu đồ (Charts Section) */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Biểu đồ cột: Trạng thái đơn hàng */}
        <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100">
          <h2 className="text-lg font-bold text-[#113e48] mb-6 flex items-center gap-2">
            <span className="w-1 h-6 bg-blue-500 rounded-full"></span>
            Tình trạng đơn hàng
          </h2>
          <div className="h-72 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart
                data={shipmentData}
                layout="vertical"
                margin={{ left: 20 }}
              >
                <CartesianGrid
                  strokeDasharray="3 3"
                  horizontal={false}
                  stroke="#e5e7eb"
                />
                <XAxis type="number" hide />
                <YAxis
                  dataKey="name"
                  type="category"
                  width={100}
                  tick={{ fontSize: 12, fill: "#6B7280" }}
                />
                <Tooltip
                  cursor={{ fill: "#F3F4F6" }}
                  contentStyle={{
                    borderRadius: "8px",
                    border: "none",
                    boxShadow: "0 4px 6px -1px rgba(0, 0, 0, 0.1)",
                  }}
                />
                <Bar
                  dataKey="value"
                  barSize={20}
                  radius={[0, 4, 4, 0]}
                  label={{ position: "right", fill: "#6B7280", fontSize: 12 }}
                >
                  {/* Tự động fill màu theo config ở trên */}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Biểu đồ đường: Doanh thu */}
        <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100">
          <h2 className="text-lg font-bold text-[#113e48] mb-6 flex items-center gap-2">
            <span className="w-1 h-6 bg-green-500 rounded-full"></span>
            Biểu đồ doanh thu (Tháng)
          </h2>
          <div className="h-72 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart
                data={stats.monthlyRevenue}
                margin={{ top: 5, right: 20, bottom: 5, left: 0 }}
              >
                <CartesianGrid
                  strokeDasharray="3 3"
                  vertical={false}
                  stroke="#e5e7eb"
                />
                <XAxis
                  dataKey="month"
                  tick={{ fontSize: 12, fill: "#6B7280" }}
                  axisLine={false}
                  tickLine={false}
                />
                <YAxis
                  tick={{ fontSize: 12, fill: "#6B7280" }}
                  axisLine={false}
                  tickLine={false}
                />
                <Tooltip
                  contentStyle={{
                    borderRadius: "8px",
                    border: "none",
                    boxShadow: "0 4px 6px -1px rgba(0, 0, 0, 0.1)",
                  }}
                  formatter={(value) =>
                    new Intl.NumberFormat("vi-VN", {
                      style: "currency",
                      currency: "VND",
                    }).format(value)
                  }
                />
                <Legend />
                <Line
                  type="monotone"
                  dataKey="total"
                  name="Doanh thu"
                  stroke="#10B981"
                  strokeWidth={3}
                  dot={{ r: 4, strokeWidth: 2, fill: "#fff" }}
                  activeDot={{ r: 6 }}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* 3. Top Tài xế */}
      <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-lg font-bold text-[#113e48] flex items-center gap-2">
            <Award className="text-yellow-500" /> Top tài xế xuất sắc
          </h2>
          <Link
            to="/admin/drivers"
            className="text-xs font-semibold text-blue-600 hover:text-blue-700 hover:underline"
          >
            Xem tất cả
          </Link>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-sm text-left">
            <thead>
              <tr className="border-b border-gray-100 text-gray-500 font-medium bg-gray-50/50">
                <th className="p-4 rounded-tl-lg">Hạng</th>
                <th className="p-4">Tài xế</th>
                <th className="p-4 text-center">Đơn hàng đã giao</th>
                <th className="p-4 text-center">Hiệu suất</th>
                <th className="p-4 rounded-tr-lg text-right">Trạng thái</th>
              </tr>
            </thead>
            <tbody>
              {stats.topDrivers?.length > 0 ? (
                stats.topDrivers.map((d, i) => (
                  <tr
                    key={i}
                    className="border-b border-gray-50 hover:bg-gray-50 transition-colors group"
                  >
                    <td className="p-4">
                      {i === 0 && <span className="text-xl">🥇</span>}
                      {i === 1 && <span className="text-xl">🥈</span>}
                      {i === 2 && <span className="text-xl">🥉</span>}
                      {i > 2 && (
                        <span className="font-bold text-gray-400 pl-2">
                          #{i + 1}
                        </span>
                      )}
                    </td>
                    <td className="p-4">
                      <div className="flex items-center gap-3">
                        <div className="w-9 h-9 rounded-full bg-blue-100 flex items-center justify-center text-blue-600 font-bold text-xs">
                          {d.name.charAt(0)}
                        </div>
                        <div>
                          <p className="font-bold text-[#113e48] group-hover:text-blue-600 transition-colors">
                            {d.name}
                          </p>
                          <p className="text-[10px] text-gray-400">
                            ID: #{1000 + i}
                          </p>
                        </div>
                      </div>
                    </td>
                    <td className="p-4 text-center font-bold text-gray-700">
                      {d.deliveries}
                    </td>
                    <td className="p-4 text-center">
                      <div className="w-24 h-1.5 bg-gray-100 rounded-full mx-auto overflow-hidden">
                        <div
                          className="h-full bg-green-500 rounded-full"
                          style={{
                            width: `${Math.min(d.deliveries * 2, 100)}%`,
                          }}
                        ></div>
                      </div>
                    </td>
                    <td className="p-4 text-right">
                      <span className="px-3 py-1 bg-green-50 text-green-600 text-xs font-bold rounded-full border border-green-100">
                        Hoạt động
                      </span>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td
                    colSpan="5"
                    className="p-8 text-center text-gray-400 italic"
                  >
                    Chưa có dữ liệu tài xế trong tháng này.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

// --- Component phụ: Thẻ thống kê (Đã sửa) ---
function StatCard({ title, value, icon, color, trend, to }) {
  const content = (
    <>
      <div>
        <p className="text-sm font-medium text-gray-500 mb-1">{title}</p>
        <h3 className="text-2xl font-extrabold text-[#113e48] tracking-tight">
          {value}
        </h3>
        <div className="flex items-center gap-1 mt-2 text-xs font-bold text-green-500 bg-green-50 px-2 py-0.5 rounded-md w-fit">
          <TrendingUp size={12} /> {trend}{" "}
          <span className="text-gray-400 font-normal ml-1">
            so với tháng trước
          </span>
        </div>
      </div>
      <div
        className={`p-3 rounded-xl shadow-lg shadow-gray-200 ${color} transition-transform group-hover:scale-110`}
      >
        {icon}
      </div>
    </>
  );

  // Nếu có link 'to', bọc trong thẻ Link
  if (to) {
    return (
      <Link
        to={to}
        className="bg-white p-5 rounded-2xl shadow-sm border border-gray-100 flex items-start justify-between hover:shadow-md hover:border-gray-200 transition-all group cursor-pointer"
      >
        {content}
      </Link>
    );
  }

  // Nếu không có link, render div bình thường
  return (
    <div className="bg-white p-5 rounded-2xl shadow-sm border border-gray-100 flex items-start justify-between">
      {content}
    </div>
  );
}

// --- Component phụ: Loading Skeleton ---
function DashboardSkeleton() {
  return (
    <div className="space-y-8 animate-pulse">
      <div className="h-8 w-48 bg-gray-200 rounded"></div>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        {[1, 2, 3, 4].map((i) => (
          <div key={i} className="h-32 bg-gray-200 rounded-2xl"></div>
        ))}
      </div>
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        <div className="h-80 bg-gray-200 rounded-2xl"></div>
        <div className="h-80 bg-gray-200 rounded-2xl"></div>
      </div>
      <div className="h-64 bg-gray-200 rounded-2xl"></div>
    </div>
  );
}
