# ⚖️ ALBION MARKET FLIP (SERVER ASIA / EAST)

Công cụ quét thị trường, tính toán tỷ suất sinh lời (**ROI**) và lợi nhuận ròng (**Net Profit**) cho chiến thuật **Flip tại chỗ (Stationary Flipping)** trong tựa game **Albion Online**, kết nối trực tiếp với dữ liệu cộng đồng thời gian thực **The Albion Online Data Project (AODP)**.

---

## 🌟 Các Tính Năng Nổi Bật

1. **Option Bật/Tắt Premium Thông Minh:**
   * **Khi CÓ Premium:** Thuế Market **4.0%** + Setup Fee **2.5%** = Tổng phí **6.5%**.
   * **Khi KHÔNG CÓ Premium:** Thuế Market **8.0%** + Setup Fee **2.5%** = Tổng phí **10.5%**.
   * Chuyển đổi công tắc chỉ với 1 click, toàn bộ bảng giá và lợi nhuận sẽ tự động tính lại ngay lập tức mà không cần tốn thời gian tải lại dữ liệu!

2. **Dữ Liệu Trực Tiếp Server ASIA (Singapore):**
   * Kết nối trực tiếp API `east.albion-online-data.com`.
   * Hỗ trợ chọn đầy đủ 7 thành phố lớn: **Lymhurst, Fort Sterling, Thetford, Bridgewatch, Martlock, Caerleon, Brecilien**.
   * Có thể đổi sang server **Americas** hoặc **Europe** bất cứ lúc nào.

3. **Cơ Sở Dữ Liệu 1,700+ Vật Phẩm Phổ Biến:**
   * Túi xách & Áo choàng thường / Faction (Thetford, Fort Sterling, Lymhurst, Martlock, Bridgewatch, Caerleon, Brecilien, Undead, Heretic, Keeper, Morgana, Demon).
   * Thú cưỡi (Ngựa cưỡi, Ngựa bọc giáp, Bò tải, Sói, Hổ nanh, Nai, Gấu, Rồng...).
   * Vũ khí Meta (Kiếm, Cung, Dao găm, Nỏ, Trượng Lửa/Băng/Nguyền/Thánh/Tự nhiên...).
   * Giáp, Mũ, Giày (Vải, Da, Sắt).
   * Thức ăn & Thuốc lắc (Pork Roast, Pork Omelette, Beef Stew, Potion máu/độc/kháng...).
   * Nguyên liệu tinh chế & Đá Rune/Soul/Relic.

4. **Bộ Lọc & Sắp Xếp Chuyên Nghiệp:**
   * Tìm kiếm theo tên tiếng Việt, tiếng Anh hoặc mã Item.
   * Lọc theo Tier (T3 - T8), Cường hóa Enchant (.0, .1, .2, .3).
   * Lọc theo Vốn tối đa (cho người mới bắt đầu ít bạc).
   * Lọc theo Lợi nhuận tối thiểu (Min Profit) & Độ tuổi dữ liệu (Data Age).
   * Sắp xếp linh hoạt: Lợi nhuận cao nhất, ROI cao nhất, Vốn ít nhất, Dữ liệu mới nhất.

5. **Bảng Tính Dòng Tiền & Kế Hoạch Vốn Chi Tiết (Modal Calculator):**
   * Bấm vào bất kỳ món đồ nào để mở bảng tính dòng tiền.
   * Nhập số lượng dự định mua -> Tool tự động tính:
     * Tổng vốn đầu tư cần có (đã gồm phí đặt lệnh mua).
     * Doanh thu thực nhận về hòm thư sau khi trừ thuế và phí bán.
     * Tổng lãi ròng thực tế đút túi và % ROI.
   * Nút **📋 Copy Tên** để dán nhanh vào thanh tìm kiếm trong game.

---

## 🚀 Hướng Dẫn Khởi Chạy

Ứng dụng chạy bằng máy chủ Node.js siêu nhẹ, không cần cài đặt thêm bất kỳ thư viện bên ngoài nào:

```bash
# 1. Di chuyển vào thư mục dự án
cd C:\Users\Admin\.gemini\antigravity-ide\scratch\albion-market-flip

# 2. Khởi chạy máy chủ
npm start
# Hoặc: node server.js
```

Sau đó mở trình duyệt truy cập:
👉 **`http://localhost:3000`**

---

## 📖 Bí Quyết Flip Tại Chỗ (Stationary Flipping) Trong Game

1. **Bước 1:** Đến khu vực chợ (Marketplace) ở thành phố bạn chọn (ví dụ: *Lymhurst*).
2. **Bước 2:** Trên tool, bật/tắt công tắc **Premium** đúng với tài khoản của bạn.
3. **Bước 3:** Nhấn **🚀 BẮT ĐẦU QUÉT THỊ TRƯỜNG**.
4. **Bước 4:** Xem danh sách cơ hội có ROI cao và nhãn cập nhật màu xanh (dưới 1-6 giờ).
5. **Bước 5:** Bấm **🧮 Tính Vốn**, xem giá Buy Order đề xuất và giá Sell Order đề xuất.
6. **Bước 6:** Bấm **Copy Tên** -> Vào chợ dán tên món đồ -> Chọn tab **Buy Order** -> Đặt lệnh mua với giá đề xuất.
7. **Bước 7:** Khi có người Instant Sell vào lệnh mua của bạn, nhận đồ vào túi -> Chọn tab **Sell Order** -> Đặt lệnh bán với giá đề xuất.
8. **Bước 8:** Nhận bạc lời về hòm thư!
