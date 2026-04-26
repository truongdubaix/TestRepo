import axios from "axios";
import dotenv from "dotenv";

dotenv.config();

const MAPBOX_TOKEN = process.env.VITE_MAPBOX_TOKEN;

const PROVINCES = [
  "Hà Nội", "Hồ Chí Minh", "Đà Nẵng", "Hải Phòng", "Cần Thơ",
  "An Giang", "Bà Rịa - Vũng Tàu", "Bà Rịa Vũng Tàu", "Bắc Giang", "Bắc Kạn",
  "Bạc Liêu", "Bắc Ninh", "Bến Tre", "Bình Định", "Bình Dương", "Bình Phước",
  "Bình Thuận", "Cà Mau", "Cao Bằng", "Đắk Lắk", "Đắk Nông", "Điện Biên",
  "Đồng Nai", "Đồng Tháp", "Gia Lai", "Hà Giang", "Hà Nam", "Hà Tĩnh",
  "Hải Dương", "Hậu Giang", "Hòa Bình", "Hưng Yên", "Khánh Hòa", "Kiên Giang",
  "Kon Tum", "Lai Châu", "Lâm Đồng", "Lạng Sơn", "Lào Cai", "Long An",
  "Nam Định", "Nghệ An", "Ninh Bình", "Ninh Thuận", "Phú Thọ", "Phú Yên",
  "Quảng Bình", "Quảng Nam", "Quảng Ngãi", "Quảng Ninh", "Quảng Trị",
  "Sóc Trăng", "Sơn La", "Tây Ninh", "Thái Bình", "Thái Nguyên", "Thanh Hóa",
  "Thừa Thiên Huế", "Tiền Giang", "Trà Vinh", "Tuyên Quang", "Vĩnh Long",
  "Vĩnh Phúc", "Yên Bái",
];

const extractProvinceFromText = (address) => {
  if (!address) return null;
  const lower = address.toLowerCase();

  const sorted = [...PROVINCES].sort((a, b) => b.length - a.length);
  for (const p of sorted) {
    if (lower.includes(p.toLowerCase())) return p;
  }
  return null;
};

const shippingController = {
  calculateFee: async (req, res) => {
    try {
      if (!MAPBOX_TOKEN) {
        return res
          .status(500)
          .json({
            success: false,
            message: "Thiếu MAPBOX_TOKEN trong file .env",
          });
      }

      const {
        pickup_address,
        receiver_address,
        pickup_lat,
        pickup_lng,
        delivery_lat,
        delivery_lng,
        weight_kg,
        service_type,
        cod_amount,
      } = req.body;

      if (!pickup_address || !receiver_address) {
        return res
          .status(400)
          .json({
            success: false,
            message: "Thiếu địa chỉ lấy hoặc giao hàng",
          });
      }

      let pickupCoords, receiverCoords;
      let pickupProvince, receiverProvince;

      if (pickup_lat && pickup_lng && delivery_lat && delivery_lng) {

        pickupCoords = [parseFloat(pickup_lng), parseFloat(pickup_lat)];
        receiverCoords = [parseFloat(delivery_lng), parseFloat(delivery_lat)];

        pickupProvince = extractProvinceFromText(pickup_address) || "Không xác định";
        receiverProvince = extractProvinceFromText(receiver_address) || "Không xác định";
      } else {

        const getInfo = async (address) => {
          const url = `https://api.mapbox.com/geocoding/v5/mapbox.places/${encodeURIComponent(address)}.json?access_token=${MAPBOX_TOKEN}&country=vn&limit=1`;
          const response = await axios.get(url);
          const feature = response.data.features[0];

          if (!feature) throw new Error(`Không tìm thấy địa chỉ: ${address}`);

          const province =
            feature.context?.find((c) => c.id.includes("region"))?.text ||
            feature.context?.find((c) => c.id.includes("place"))?.text ||
            feature.text;

          return {
            coords: feature.center,
            province: province
              .replace("Thành phố ", "")
              .replace("Tỉnh ", "")
              .trim(),
          };
        };

        const pickup = await getInfo(pickup_address);
        const receiver = await getInfo(receiver_address);
        pickupCoords = pickup.coords;
        receiverCoords = receiver.coords;
        pickupProvince = pickup.province;
        receiverProvince = receiver.province;
      }

      const routeUrl = `https://api.mapbox.com/directions/v5/mapbox/driving/${pickupCoords.join(",")};${receiverCoords.join(",")}?access_token=${MAPBOX_TOKEN}&overview=false`;
      const routeRes = await axios.get(routeUrl);

      if (!routeRes.data.routes || routeRes.data.routes.length === 0) {
        throw new Error("Không thể tìm đường đi giữa 2 điểm này");
      }

      const distanceKm = routeRes.data.routes[0].distance / 1000;

      const isInterProvincial =
        pickupProvince.toLowerCase() !== receiverProvince.toLowerCase();
      let baseFee = 0;
      const weight = parseFloat(weight_kg) || 0.5;
      const cod = parseFloat(cod_amount) || 0;

      if (isInterProvincial) {

        const basePrices = { economy: 30000, express: 40000, fast: 55000 };
        baseFee = basePrices[service_type] || 30000;

        const ratePerKm = { economy: 500, express: 700, fast: 1200 };
        const rate = ratePerKm[service_type] || 500;

        if (distanceKm <= 100) {
          baseFee += distanceKm * rate;
        } else if (distanceKm <= 500) {
          baseFee += 100 * rate + (distanceKm - 100) * rate * 0.5;
        } else {
          baseFee +=
            100 * rate +
            400 * rate * 0.5 +
            (distanceKm - 500) * rate * 0.2;
        }

        if (weight > 0.5) {
          const extraSteps = Math.ceil((weight - 0.5) / 0.5);
          const stepPrices = { economy: 5000, express: 7000, fast: 10000 };
          baseFee += extraSteps * (stepPrices[service_type] || 5000);
        }
      } else {

        if (distanceKm < 5) {
          baseFee = { economy: 16500, express: 22000, fast: 35000 }[
            service_type
          ];
        } else if (distanceKm <= 10) {
          baseFee = { economy: 20000, express: 28000, fast: 45000 }[
            service_type
          ];
        } else if (distanceKm <= 20) {
          baseFee =
            service_type === "fast"
              ? distanceKm * 5000
              : { economy: 30000, express: 40000 }[service_type];
        } else {

          const startPrice = { economy: 30000, express: 40000, fast: 50000 }[
            service_type
          ];
          const kmRate = { economy: 2000, express: 3000, fast: 5000 }[
            service_type
          ];
          baseFee = startPrice + (distanceKm - 20) * kmRate;
        }
      }

      const vat = baseFee * 0.1;
      const codFee = cod > 2000000 ? cod * 0.005 : 0;
      const totalShipping = baseFee + vat + codFee;

      res.json({
        success: true,
        distance_km: distanceKm.toFixed(1),
        is_inter_provincial: isInterProvincial,
        base_fee: baseFee,
        vat_fee: vat,
        cod_fee: codFee,
        total_shipping: totalShipping,
        total_collect: totalShipping + cod,
        details: {
          pickup_province: pickupProvince,
          receiver_province: receiverProvince,
          weight: weight,
        },
      });
    } catch (error) {
      res.status(500).json({ success: false, message: error.message });
    }
  },
};

export default shippingController;
