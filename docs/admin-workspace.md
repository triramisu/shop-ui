# WEB-ADMIN-01 — quản trị Catalog và Inventory

## Hợp đồng nhiệm vụ — 27/10/2026

1. ADMIN/STAFF cần một không gian vận hành riêng tại `/admin`: tổng quan có
   dữ liệu thật, danh mục, sản phẩm/biến thể/ảnh, số dư và lịch sử kho. Không
   làm quản trị user/role, doanh thu, hoàn tiền hoặc tạo dashboard AWS trong task.
2. Nguồn sự thật là CatalogAdministrationController, ProductImageController,
   InventoryAdministrationController và DTO Java hiện hành. Không đổi backend,
   Flyway hoặc quyền có sẵn; không tạo quyền trong browser.
3. Tìm/lọc/phân trang → mở chi tiết → chỉnh form → gửi request có version →
   đọc lại server. Tạo sản phẩm nháp rồi thêm SKU, ảnh và công bố có chủ đích.
   Kho dùng quantityDelta, lý do, version; không sửa `reserved`/`available`.
4. Chờ my-info trước khi mở trang. ADMIN/STAFF và capability phải khớp phiên;
   scope JWT chỉ là gợi ý UI, backend vẫn xác minh/chặn mọi API. USER bị từ chối
   trước khi mount page/query. Không lưu token mới hoặc ghi URL ảnh ký tạm.
   Cache private theo actor và hủy/xóa khi đổi phiên; mutation không tự retry.
5. Đầu ra: admin layout/route guard, API/DTO typed, forms và table responsive,
   menu vào quản trị cho người có quyền, test và fixture local tách production.
6. Kiểm tra anonymous/USER/STAFF thiếu quyền/đủ quyền/ADMIN, reload/deep-link,
   logout/đổi user, 403/409/429/5xx, form validation, ảnh multipart, stock
   conflict và không tự replay mutation. Không ghi dữ liệu prod để test UI.
7. Gate: TypeScript + Node regression + Vite build/audit, browser với fixture
   local và kiểm artifact CD. Dùng skill idk/ui-ux-pro-max/ui-styling, font/token
   hiện hữu, không cài component framework. Không chứng nhận full WCAG từ smoke.
8. Phát hành theo PR → verify/dependency-review → main CI/CD → release marker.
   Không đổi IAM, WAF, SG, secret hoặc DB. Rollback source/artifact UI; dữ liệu
   đã ghi hợp lệ không bị xóa để rollback giao diện.

## Quyền và điều hướng

`/admin` dùng chung cho ADMIN và STAFF. Menu và nút hiển thị theo các scope
`CATALOG_READ`, `CATALOG_WRITE`, `CATALOG_PUBLISH`, `CATALOG_IMAGE_MANAGE`,
`INVENTORY_READ`, `INVENTORY_WRITE` thực tế. Tên role không tự cấp capability.
Scope được đối chiếu với username từ my-info, loại token access, expiry và
role trong profile; parse lỗi/thiếu quyền sẽ đóng truy cập. Đây không phải
chữ ký JWT kiểm bằng JavaScript; Spring Security là ranh giới authorization.

## Nguyên tắc giao diện

Sidebar trắng/navy, đường viền mảnh, cobalt cho action/focus; bảng trong khung
scroll riêng trên mobile. Số liệu chỉ là số sản phẩm/bản ghi SKU×kho từ API;
không cộng tất cả SKU hay đoán doanh thu từ một trang phân trang. Form giữ dữ
liệu khi lỗi, có nhãn và thông báo; 409 yêu cầu đọc bản mới, không tự ghi đè.
Upload ảnh đi qua backend ObjectStorage hiện hữu tới S3; browser không cần
AWS key và không đi qua S3 Gateway Endpoint của VPC.

## Đối chiếu API hiện hữu

| Chức năng | API dưới `/api` | Capability |
| --- | --- | --- |
| Xem danh mục/sản phẩm/ảnh | GET `/admin/catalog/categories`, `/products`, `/products/{id}`, `/products/{id}/images` dưới base Catalog | CATALOG_READ |
| Tạo/sửa danh mục/sản phẩm/SKU | POST/PUT/PATCH tương ứng tại `/admin/catalog` | CATALOG_WRITE |
| Công bố/ẩn | PATCH `/admin/catalog/products/{id}/publish` hoặc `/hide` | CATALOG_PUBLISH |
| Upload/chọn đại diện/sắp xếp/xóa ảnh | POST images, PUT images/arrangement, DELETE images/{imageId} | CATALOG_IMAGE_MANAGE |
| Xem kho/lịch sử | GET `/admin/inventory/stock-items`, `/{id}`, `/{id}/movements` | INVENTORY_READ |
| Khởi tạo/điều chỉnh | POST stock-items, POST `/{id}/adjustments` | INVENTORY_WRITE |

`productVersion` dùng khi thêm SKU; `version` của variant khi sửa SKU, version
của product khi sửa nội dung/công bố. Category và StockItem cũng có version
riêng. Không dùng version sản phẩm cho variant hoặc tự cộng version phía UI.
Giá dạng chuỗi decimal được gửi nguyên dạng; phần hiển thị quản trị giữ phần
thập phân VND, không làm tròn thành đồng nguyên như cách hiển thị storefront.

## Chạy local với fixture — không ghi production

```powershell
cd D:/shop-ui
# Dừng Vite trước npm ci trên Windows để tránh khóa esbuild.exe.
npm ci
npm run build
# Terminal 1: chỉ dữ liệu trong bộ nhớ, không AWS/SQL/merchant.
node tests/fixtures/admin-preview.mjs
# Terminal 2:
$env:VITE_DEV_API_TARGET='http://127.0.0.1:5192'
npm run dev -- --host 127.0.0.1 --port 5194 --strictPort
```

Mở `http://127.0.0.1:5194/admin`. Các tài khoản **chỉ tồn tại ở fixture**:
`qa-admin` (ADMIN đủ quyền), `qa-staff` (STAFF đủ quyền), `qa-reader` (STAFF
chỉ đọc), `qa-inventory` (STAFF chỉ đọc kho), `qa-user` (USER). Mật khẩu
fixture local: `PreviewOnly123!`. Đây không phải account/mật khẩu production;
server bind loopback và dữ liệu mất khi dừng process. Không tạo các account
này trên RDS. File fixture và khung responsive không có trong `dist/`.

Khung responsive: `/tests/fixtures/admin-review.html`; có các kích thước
1440×1100, 1200×1000, 768×1024, 375×900, 812×375. Sau khi đăng nhập trong tab
cùng origin, iframe sử dụng phiên đó qua luồng đăng nhập bình thường; không
tiêm localStorage hoặc bypass guard để xem ảnh.

Để chạy backend thật local, đổi dev target về backend dev. Production vẫn
`VITE_API_BASE_URL=/api`; không đổi env production sang server fixture hoặc
localhost. Không chạy fixture trên EC2, không upload fixture vào S3 UI.

## Kiểm tra và giới hạn

- Test pure access/capability fail-closed; actual AdminGate không mount child
  khi loading/thiếu profile/thiếu quyền. Cache private tách actor và logout cleanup.
- API tests kiểm version, UUID segment, không replay mutation trên 401,
  multipart không có JSON Content-Type, validation số nguyên/giá/file.
- Browser: anonymous → login; USER → 403 trước admin request; STAFF chỉ đọc
  không có tạo/sửa; STAFF chỉ kho không thấy/mở Catalog; STAFF đủ quyền có tạo.
- Tạo nháp → thêm SKU decimal → sửa metadata → công bố có xác nhận đạt trên
  fixture. Thử cập nhật từ actor thứ hai: 409 giữ input, tải bản mới có xác nhận.
- Upload qua input file thật, ảnh hiển thị; multipart đích là fixture, không
  phải bằng chứng upload S3 production. Backend storage contract giữ nguyên.
- Kho 53 thực tế/1 đang giữ: giảm 53 bị từ chối; tăng 5 trả 58/1/57 và thêm
  movement. Không gọi reserve/confirm/payment để thử admin UI.
- Tạo danh mục, phân trang 13 bản ghi thành 2 trang, lỗi GET 503 có nút thử lại.
- Đo dashboard và các trang list/detail ở desktop/tablet/mobile. Bảng sản phẩm
  ban đầu gây tràn 375px; đã chuyển mobile sang danh sách thẻ và đo lại HTML/
  body đều 360px. Các bảng còn lại cuộn bên trong khung riêng.
- [Ảnh desktop local](previews/admin-desktop.png) và
  [ảnh mobile local](previews/admin-mobile.png) là dữ liệu fixture, không phải
  ảnh phiên ADMIN production. Chỉ cắt toolbar của khung QA, không sửa nội dung.

Lần QA đầu phát hiện fixture chưa trả cart cho navbar sau login, gây 401 và
logout đúng cơ chế hiện hữu. Đã bổ sung cart rỗng authenticated trong fixture,
không sửa/hạ auth client để che lỗi. Các lượt RBAC/mutation phía trên thực hiện
sau khi fixture được sửa. Chưa nghiệm thu ghi bằng account ADMIN/STAFF thật
trên production và không chứng nhận toàn bộ WCAG hoặc backend milestone từ UI.

## Dùng trên website sau phát hành

1. Đăng nhập tài khoản thật đã được backend cấp ADMIN/STAFF và capability.
2. Mở `/admin`, hoặc chọn **Quản trị cửa hàng** từ menu/hồ sơ.
3. Tạo danh mục nếu cần, tạo sản phẩm nháp, thêm SKU/giá và upload ảnh.
4. Khởi tạo tồn ở đúng mã kho (checkout hiện dùng mã cấu hình trên backend).
5. Kiểm tra dữ liệu rồi mới công bố. Không dùng account ADMIN để mua thử.
6. Khi gặp 409, giữ ý định chỉnh sửa, tải bản mới rồi kiểm lại trước khi lưu.
   Khi timeout/5xx, đọc trạng thái hiện tại trước khi thử thao tác ghi lần nữa.
7. Gỡ quyền hoặc đổi role bằng API quản trị Identity hiện hữu; frontend task
   này không có màn hình cấp quyền. Phiên bị thu hồi cần đăng nhập lại.

Build/audit/CI và trạng thái phát hành được nghiệm thu trong PR/workflow; kiểm
`release.json` trên website khớp HEAD main theo [runbook](ui-cicd.md).

## Gate local đã chạy

- `npm run build`: TypeScript, **107/107 Node tests** và Vite production đạt;
  13 test admin mới, không fail/skip. `npm audit --audit-level=moderate`: 0 finding.
- Chunk admin lazy: JS 46,38 KB (gzip 11,97 KB), CSS 16,26 KB (gzip 3,76 KB).
  Gate artifact hiện hữu đạt 33 file, không chứa fixture/tests/skill/env local.
- Diff check đạt; không đổi dependency/lockfile, env, pipeline, token storage,
  auth API hoặc apiClient. Customer cache chỉ thêm nhóm private `admin` vào
  cleanup hiện hữu. Backend source/schema/tài nguyên AWS giữ nguyên.
- Screenshot desktop 1440×1100 và mobile 375×900 được chụp từ app thật trong
  browser, dùng tài khoản STAFF fixture đủ quyền. Không dựng ảnh thay giao diện.
- Gate local không thay trạng thái CI/main. PR phải đủ verify/dependency-review;
  sau merge đợi verify/deploy thành công và marker đúng SHA trước khi bàn giao.

## Biên bản phát hành — 27/10/2026

1. Commit ứng dụng `a2bf0b3282c84bf208a4ad7bb2b9acfb67e3e131` được push lên
   `feature/admin-ui/catalog-inventory`, gồm 29 file; skill local có sẵn không
   đưa vào commit. Không force-push hoặc đổi branch protection.
2. [PR #10](https://github.com/triramisu/shop-ui/pull/10) vào main có
   [run 40484290428](https://github.com/triramisu/shop-ui/actions/runs/40484290428):
   `verify` và `dependency-review` success; deploy skipped đúng vì là PR.
3. Squash merge tạo `e59321d47fcce99e436d29035011b876322a480b`.
   [Run main 40484606150](https://github.com/triramisu/shop-ui/actions/runs/40484606150)
   có verify/deploy success. Runner build artifact từ đúng main, OIDC chỉ role
   UI hiện hữu, upload assets trước/index sau, invalidation và HTTPS/API smoke.
   Không upload dist bằng tay, không dùng AWS credential trong trình duyệt.
4. GET marker và index HTTPS trả 200, commit khớp SHA trên; hash index thực tế
   khớp `f93677f18be238d4fefa0ef0d2a429dd570a001f6a6ffb6064b4aed2ac0f7fad`.
   Đã mở `/admin` trong browser anonymous và thấy chuyển tới `/login`, có form
   đăng nhập; không nhập credential ADMIN hoặc ghi dữ liệu production để QA.
5. Tài liệu được cập nhật qua PR riêng, vẫn đủ hai gate. Commit tài liệu sau
   có thể đổi marker commit; SHA trên là mốc phát hành chức năng, không phải
   cam kết HEAD luôn giữ nguyên. Dùng runbook CI/CD để kiểm marker mới nhất.

Nếu tái hiện phát hành: push branch → tạo PR → hai gate xanh → merge main →
đợi verify/deploy xanh → đọc marker/index → mở deep link. Khi thiếu quyền write
ở connector GitHub và tab GitHub timeout trong đợt này, đã dùng GitHub REST
chính thức bằng phiên Git Credential Manager hiện hữu, credential chỉ trong
RAM; không tạo token, mở rộng scope hoặc thay cấu hình mạng/bảo vệ repo.

Để nghiệm thu vận hành bằng account thật: chủ dự án tự đăng nhập ADMIN/STAFF
đã có quyền tại `/admin`, đọc danh sách trước rồi tạo một sản phẩm nháp có chủ
đích. Ảnh upload đi theo backend tới bucket sản phẩm hiện hữu, EC2 dùng S3
Gateway Endpoint; UI không trỏ trình duyệt vào endpoint private. Quy trình
này không chứng nhận ghi S3/RDS production từ các lượt fixture local ở trên.
Không đưa mật khẩu, JWT, URL ảnh ký tạm hoặc nội dung secret vào README.
