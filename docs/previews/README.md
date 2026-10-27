# Ảnh review UI-EDITORIAL-02

Screenshot lấy trực tiếp từ bản local trong browser ngày 27/10/2026. Bản cập
nhật UI-COMMERCE-03 dùng dev proxy tới Catalog đã deploy sau khi ASG được bật
lại; thay các screenshot fixture ở lượt UI-EDITORIAL-02 trước đó.

- `editorial-desktop.png`: khung iframe 1440×1700, client 1425px do scrollbar.
- `editorial-mobile.png`: khung iframe 375×812, client 360px do scrollbar.
- `commerce-detail-desktop.png`: khung iframe 1200×1000, client 1185px.

Chỉ cắt toolbar QA bên ngoài iframe, không sửa nội dung UI. Sản phẩm trong ảnh
là dữ liệu **DEMO từ Catalog đã deploy**, không phải hàng bán thật. Screenshot
là bằng chứng local trước phát hành. API trả 200, API private trả 401 đúng. Fixture offline
vẫn giữ riêng và không nằm trong `dist/`.

Xem [hướng dẫn và gate mới nhất](../commerce-refinement.md).

## WEB-ADMIN-01

`admin-desktop.png` (1440×1100) và `admin-mobile.png` (375×900): app quản trị
local với STAFF fixture đủ quyền, dữ liệu trong bộ nhớ server 5192. Không dùng
phiên ADMIN production hoặc gọi mutation AWS/RDS/S3 để chụp. Chỉ cắt toolbar
44px của khung responsive. [Hướng dẫn và giới hạn](../admin-workspace.md).
