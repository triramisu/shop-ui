# Aydibro storefront

React 18 + TypeScript + Vite, sử dụng API thật của Shop. Thiết kế riêng theo hướng editorial: nền kem, chữ đậm, màu đất nung, ảnh có khoảng thở và bố cục gọn. Không dùng layout/template của hai dự án tham khảo.

## Chạy local

Đây là project UI riêng tại `D:/shop-ui`, không còn nằm trong repo backend.
Backend đặt trực tiếp tại `D:/shop` (không có lớp `backend/`); chạy backend, MySQL và MinIO theo
`D:/shop/README.md` trước. Hai project chỉ giao tiếp qua HTTP API, không import
source của nhau.

```powershell
cd D:/shop-ui
npm ci
npm run dev
```

Mở `http://localhost:5173`. Backend mặc định ở `http://localhost:8080`.

Nếu cần đổi API, tạo `.env.local` từ `.env.example`:

```dotenv
VITE_API_BASE_URL=/api
VITE_DEV_API_TARGET=http://localhost:8080
```

- `VITE_DEV_API_TARGET` chỉ dùng cho proxy dev. Khởi động lại Vite khi đổi biến này.
- `VITE_API_BASE_URL` được nhúng vào bundle khi build. Không đưa secret/token vào biến `VITE_*`.
- Nếu truy cập bằng origin khác, cấu hình CORS của backend phải cho phép đúng origin đó; không mở wildcard để chữa lỗi đăng nhập.
- Các script chỉ định `vite.config.ts` tường minh, tránh chọn nhầm file JS cấu hình sinh sẵn trong repository.

## Cấu trúc và Git

```text
D:/
├── shop/                 # backend và cấu hình deploy chung
│   ├── src/              # Spring Boot
│   ├── pom.xml
│   ├── mvnw.cmd
│   └── Dockerfile        # Dockerfile backend
└── shop-ui/              # project này
    ├── src/
    ├── public/           # ảnh, font, favicon và giấy phép
    ├── nginx/
    ├── Dockerfile
    ├── .env.example      # cấu hình mẫu; .env.local thật không commit
    └── package.json
```

Repo UI độc lập: [triramisu/shop-ui](https://github.com/triramisu/shop-ui).
Lịch sử frontend trước khi tách vẫn còn trong Git của `shop`; không xóa lịch sử
đó. `git push` ở backend không đưa code UI mới lên GitHub. Clone UI riêng:

```sh
git clone https://github.com/triramisu/shop-ui.git
cd shop-ui
npm ci
npm run build
```

CI/CD UI và triển khai cloud là bước riêng; đưa source lên GitHub không đồng
nghĩa đã deploy. Các file JS/declaration Vite và TypeScript build cache sinh
từ lần build cũ được bỏ qua; cấu hình nguồn là `vite.config.ts`.

Không commit `node_modules/`, `dist/`, `.env*` thật hoặc token. File mẫu
`.env.example` được theo dõi. `.gitattributes` giữ shell entrypoint ở LF để
image nginx chạy được trên Linux sau khi clone trên Windows.

## Phạm vi giao diện

| Màn hình             | Dữ liệu và hành vi                                                                                             |
| -------------------- | -------------------------------------------------------------------------------------------------------------- |
| Trang chủ / danh mục | Danh mục, tìm kiếm, sắp xếp, phân trang từ Catalog API; bộ lọc nằm trên URL                                    |
| Chi tiết sản phẩm    | Ảnh từ Catalog image API, chọn SKU, số lượng, thêm giỏ; giữ lựa chọn khi chuyển qua đăng nhập                  |
| Đã lưu               | Lưu ID sản phẩm trên trình duyệt; đọc thông tin hiện tại từ Catalog API, không phải wishlist đồng bộ tài khoản |
| Đăng nhập / đăng ký  | Validation, ẩn/hiện mật khẩu, CAPTCHA thích ứng theo phản hồi backend, quay lại trang đang mua                 |
| Giỏ hàng             | Cập nhật/xóa SKU qua Cart API; tên và giá từ báo giá phía server                                               |
| Đặt hàng             | Báo giá theo phiên bản giỏ; giá/tồn kho do server kiểm tra; retry trong cùng lượt dùng lại idempotency key     |
| Đơn hàng             | `/orders` phân trang, `/orders/:orderId` đọc snapshot/trạng thái hiện tại từ API theo chủ sở hữu; reload được |
| Xác nhận             | Checkout mở chi tiết theo ID; URL xác nhận cũ bridge tới API detail, không render snapshot tài khoản trước |
| Hồ sơ                | Thông tin thật của tài khoản, đăng xuất và xóa cache giỏ/báo giá khi đổi tài khoản                             |

Mọi trang có trạng thái tải, rỗng hoặc lỗi phù hợp. Ảnh sản phẩm lỗi/thiếu dùng placeholder trung tính, không gán ảnh minh họa thành hàng hóa thật. Không thêm đánh giá, giảm giá hoặc tồn kho giả.

## Điểm cần biết trước khi phát hành

- Đây là storefront khách hàng, chưa phải dashboard quản trị.
- Chưa thêm luồng VNPay/Stripe hosted checkout hoặc địa chỉ giao hàng. Lịch sử/chi tiết đơn đã có trong WEB-01, bắt buộc backend hỗ trợ hai API GET `/api/orders` và `/api/orders/{orderId}`.
- Backend dev mặc định dùng payment provider `fake`; đơn QA có thể trả `PAID`. Điều này không chứng minh thanh toán thật đã hoạt động.
- Backend hiện tạo đơn từ snapshot giỏ nhưng không tự dọn giỏ. UI giữ đúng trạng thái API; không tự gọi xóa toàn bộ giỏ sau đặt hàng vì có thể xóa thay đổi từ tab khác.
- Cart/quote hiện chỉ cung cấp SKU/tên dòng hàng, chưa có ảnh hay product ID. Giỏ hiển thị biểu tượng thay vì suy đoán ảnh sản phẩm.
- Trang chi tiết đọc lại trạng thái do Order xác nhận, không tự gọi provider hoặc coi redirect/flag browser là thanh toán thành công. Nút cập nhật tải lại API; không có timeline giao hàng giả.
- Cache đơn theo user ID, được cancel/remove khi logout/đổi phiên. Client loại response riêng tư của phiên cũ và chặn refresh đến muộn ghi đè phiên mới. Backend vẫn là nơi bắt buộc kiểm tra ownership; ẩn nút ở UI không thay thế phân quyền.
- Kho catalog trống thì UI hiển thị trạng thái rỗng, không tự chèn dữ liệu demo vào hệ thống.

## Kiểm tra và build

```powershell
npm run lint
npm test
npm run build
```

`lint` kiểm tra TypeScript cho cả ứng dụng và cấu hình Vite, không sinh JS cạnh source hoặc sửa build artifact đang được Git theo dõi. Cache TypeScript của cấu hình nằm trong `node_modules/.tmp/`. `test` chạy 6 kiểm tra session/cache bằng Node built-in test runner và TypeScript hiện có, không thêm dependency. `build` chạy cả TypeScript và test trước khi tạo `dist/`.

Khi dùng Dockerfile hiện có, tài nguyên mới trong `public/` được đưa vào image qua Vite build. Nếu đưa `dist/` lên S3/CloudFront, cần SPA fallback về `index.html` và cấu hình API/CORS đúng trước khi build. Không cần chạy React dev server trong production.

Build image từ chính thư mục UI, không dùng context repo backend:

```powershell
cd D:/shop-ui
docker build -t t1r4m15u/shop-ui:local .
```

Lệnh trên chỉ build local, không push/deploy. Image nginx mặc định proxy API
tới `app:8080`; khi tự chạy container, đặt `APP_UPSTREAM` theo hostname backend
trên cùng Docker network. Nếu dùng lab Compose của backend, đặt hai project cạnh
nhau hoặc cấu hình `SHOP_UI_CONTEXT` (tính từ `shop/deploy/lab/`) trỏ tới đây.
Compose backend-only và pipeline image backend không cần source UI.

Rollback giao diện bằng cách triển khai lại frontend image/bundle trước đó. Lần thay đổi này không sửa Java API hay migration, không cần rollback schema. Không dùng reset toàn bộ worktree vì có thể mất thay đổi khác của người dùng.

Font Be Vietnam Pro được phục vụ nội bộ, kèm giấy phép trong `public/fonts/OFL.txt`. Nguồn ảnh minh họa và prompt ảnh hero ở `public/images/ATTRIBUTION.md`.

## Nghiệm thu thủ công — 15/10/2026

Sau khi tách sang `D:/shop-ui`, đã build lại thành công và kiểm tra HTTP qua
dev proxy ở cổng 5173/5174: catalog thật, 8 sản phẩm QA, ảnh/font và API giỏ hàng
từ chối truy cập anonymous (401). Không thay đổi code ứng dụng trong task tách
thư mục; các kiểm thử thao tác bên dưới là từ lần bàn giao giao diện trước đó.

Kiểm thử local bằng backend thật và MinIO, với schema `shop_ui_qa_20261015` / bucket `shop-ui-review-20261015` riêng; không seed catalog vào schema `shop`.

- Trang chủ tải 8 sản phẩm QA và ảnh từ Catalog/MinIO.
- Chi tiết: chọn phiên bản, đổi ảnh, lưu sản phẩm, chuyển sang đăng nhập rồi quay về sản phẩm.
- Đăng nhập khách QA, thêm SKU vào giỏ, tăng số lượng lên 2; báo giá cập nhật thành 3.380.000 VND từ server.
- Tạo đơn QA và nhận trang xác nhận có mã đơn/snapshot thật; không gọi cổng thanh toán thật.
- Trang chủ và tìm kiếm ở viewport điện thoại 390px không tràn ngang.
- Tìm kiếm “tai nghe” trả đúng 2 sản phẩm QA; danh sách đã lưu vẫn còn sau tải lại trang.
- Giao diện sáng/tối, hồ sơ và đăng xuất đã kiểm tra; viewport tablet 768px và desktop 1440px không tràn ngang.
- Phiên bản “Tiêu chuẩn” và số lượng 3 được giữ nguyên sau đăng nhập từ trang sản phẩm.
- Từ khóa không tồn tại hiển thị trạng thái rỗng và có nút quay về toàn bộ catalog.
- Lọc “Tai nghe & âm thanh” trả đúng 3 sản phẩm QA; sắp xếp tên A–Z theo thứ tự Loa → Soundcore → Ugreen.
- `npm run build` (bao gồm TypeScript gate) và `git diff --check` đạt ở bản bàn giao local.

Đây là smoke test UI, không thay thế kiểm thử bảo mật, full regression backend hoặc kiểm thử thanh toán sandbox. Chưa xác nhận CI/deploy production cho thay đổi này.

## WEB-01 — 16/10/2026

- Lịch sử/chi tiết đơn, reload URL, nút cập nhật và trang quá cuối được kiểm tra trên API thật của QA riêng.
- Đổi customer → ADMIN: cùng mã đơn bị từ chối, lịch sử ADMIN không hiện cache customer; đăng nhập lại customer về đúng URL đã yêu cầu.
- Checkout QA provider fake tạo đơn 2 dòng/3 sản phẩm, 5.570.000 VND; trang mới đọc lại từ server và reload được. Không thực hiện thanh toán thật hoặc tự dọn giỏ.
- Desktop 1440/mobile 390 không tràn ngang. 6 test session/cache và TypeScript/Vite build đạt; backend full regression 418 test đạt. Chưa xác nhận CI/deploy.
- UI và backend cần release tương thích: backend mới trước UI. Rollback về artifact trước của từng project, không xóa dữ liệu đơn hoặc reset worktree.
