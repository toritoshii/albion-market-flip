# ⚖️ ALBION MARKET FLIP (SERVER ASIA / EAST)

Công cụ quét thị trường, tính toán tỷ suất sinh lời (**ROI**) và lợi nhuận ròng (**Net Profit**) cho chiến thuật **Flip tại chỗ (Stationary Flipping)** trong tựa game **Albion Online**, kết nối trực tiếp với dữ liệu cộng đồng thời gian thực **The Albion Online Data Project (AODP)**.

---

## 🌟 Các Tính Năng Nổi Bật

1. **3 chiến thuật flip:**
   * **⚖️ Flip tại chỗ:** Buy Order (giá mua cao nhất + 1) ➔ Sell Order (giá bán thấp nhất − 1) trong cùng thành phố.
   * **🐂 Chạy hàng giữa thành phố:** mua ở thành phố A, tool tự tìm thành phố B bán lời nhất. Chọn được mua ngay / đặt Buy Order, bán bằng Sell Order / bán ngay, và tránh Caerleon (vùng đỏ).
   * **🏴 Black Market:** mua gear ở thành phố (hoặc ngay tại Caerleon), bán ngay cho Black Market. Chỉ tính các món BM thật sự mua (vũ khí, giáp, túi, áo choàng).
   * Chọn **🌐 Mọi Thành Phố** để tool tự tìm nơi mua rẻ nhất.
   * **💰 Bán Loot** (cho người vốn ít, đi farm): món bạn đã có thì bán ở đâu, bán kiểu gì (bán ngay / Sell Order / Black Market) để thực nhận nhiều bạc nhất. Có kèm phương án bán ngay tốt nhất nếu không muốn chờ.
   * **🔔 Tự quét & thông báo:** tự quét lại mỗi 5–30 phút, hiện thông báo trình duyệt khi có cơ hội mới thoả bộ lọc (để tab mở). Chỉ đọc dữ liệu công khai từ AODP, không đụng vào client game.

2. **Quét 1 lần cho mọi thành phố:** mỗi lô item lấy giá cả 7 thành phố + Black Market trong 1 request. Đổi thành phố, chiến thuật hay Premium chỉ tính lại, **không phải quét lại**.

3. **Lượng bán / ngày & Lời / ngày:**
   * Tự tải lịch sử giao dịch 7 ngày (AODP history API) cho 200 món tốt nhất, chạy nền.
   * Cột **Bán / Ngày**: trung bình số món bán ra mỗi ngày ở nơi bạn bán.
   * Cột **Lời / Ngày ~**: lời/cái × 10% lượng bán (giả định bạn chiếm được 10% thị trường). Spread to mà không ai mua thì cột này sẽ cho thấy ngay.
   * Bộ lọc **Bán tối thiểu / ngày**.

4. **Lọc giá ảo:** bỏ các cặp giá chênh quá 2x / 3x / 5x (thường là lệnh troll hoặc dữ liệu cũ).

5. **Phí chuẩn theo từng kiểu lệnh:**
   * Đặt lệnh (Buy Order / Sell Order): setup fee **2.5%**.
   * Mua ngay: **không phí**. Bán ngay / bán cho Black Market: chỉ mất thuế.
   * Thuế bán: **4%** (Premium) / **8%** (không Premium).

6. **Danh mục ~7,700 vật phẩm sinh tự động từ file game** ([ao-bin-dumps](https://github.com/ao-data/ao-bin-dumps)):
   * Mọi ID đều đúng (bản cũ có 142 ID sai, ví dụ toàn bộ nguyên liệu enchant phải là `T4_PLANKS_LEVEL1@1`).
   * Tên tiếng Anh đúng tên trong game ➔ nút **📋 Copy Tên** dán thẳng vào ô tìm kiếm của Market.
   * Hỗ trợ enchant .0 – .4, off-hand, nguyên liệu thô.
   * Cập nhật sau mỗi bản patch: `npm run build:catalog`.

7. **Bộ lọc & sắp xếp:** tên VN/EN/mã item, Tier, Enchant, Vốn tối đa, Lời tối thiểu, Độ cũ dữ liệu, Bán/ngày. Sắp xếp theo lời, ROI, vốn, lượng bán, lời/ngày, độ mới.

8. **Bảng tính dòng tiền:** bấm vào món bất kỳ ➔ số lượng mặc định = 10% lượng bán/ngày, hướng dẫn từng bước theo đúng chiến thuật (mua ở đâu, chở đi đâu, bán kiểu gì).

9. **Chống quá tải API:** throttle ~170 request/phút (dưới giới hạn AODP), tự retry khi bị 429/5xx.

---

## 🚀 Hướng Dẫn Khởi Chạy

Ứng dụng chạy bằng máy chủ Node.js siêu nhẹ, không cần cài đặt thêm bất kỳ thư viện bên ngoài nào:

```bash
# 1. Di chuyển vào thư mục dự án
cd albion-market-flip

# 2. (Tuỳ chọn) Cập nhật danh mục item sau bản patch mới
npm run build:catalog

# 3. Khởi chạy máy chủ
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
