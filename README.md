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

| Màn hình                       | Dữ liệu và hành vi                                                                                                  |
| ------------------------------ | ------------------------------------------------------------------------------------------------------------------- |
| Trang chủ / danh mục           | Danh mục, tìm kiếm, sắp xếp, phân trang từ Catalog API; bộ lọc nằm trên URL                                         |
| Danh sách sản phẩm `/products` | Trang PLP riêng: bộ lọc danh mục/từ khóa, sắp xếp, lưới/danh sách, lưu sản phẩm; hộp thoại lọc nháp trên điện thoại |
| Chi tiết sản phẩm              | Ảnh từ Catalog image API, chọn SKU, số lượng, thêm giỏ; giữ lựa chọn khi chuyển qua đăng nhập                       |
| Đã lưu                         | Lưu ID sản phẩm trên trình duyệt; đọc thông tin hiện tại từ Catalog API, không phải wishlist đồng bộ tài khoản      |
| Đăng nhập / đăng ký            | Validation, ẩn/hiện mật khẩu, CAPTCHA thích ứng theo phản hồi backend, quay lại trang đang mua                      |
| Giỏ hàng                       | Cập nhật/xóa SKU qua Cart API; tên và giá từ báo giá phía server                                                    |
| Đặt hàng                       | Báo giá theo phiên bản giỏ; giá/tồn kho do server kiểm tra; retry trong cùng lượt dùng lại idempotency key          |
| Đơn hàng                       | `/orders` phân trang, `/orders/:orderId` đọc snapshot/trạng thái hiện tại từ API theo chủ sở hữu; reload được       |
| Xác nhận                       | Checkout mở chi tiết theo ID; URL xác nhận cũ bridge tới API detail, không render snapshot tài khoản trước          |
| Hồ sơ                          | Thông tin thật của tài khoản, đăng xuất và xóa cache giỏ/báo giá khi đổi tài khoản                                  |

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

`lint` kiểm tra TypeScript cho cả ứng dụng và cấu hình Vite, không sinh JS cạnh source hoặc sửa build artifact đang được Git theo dõi. Cache TypeScript của cấu hình nằm trong `node_modules/.tmp/`. `test` chạy 26 kiểm tra (6 session/cache, 12 trạng thái URL/phân trang/giá của PLP và 8 motion/cleanup) bằng Node built-in test runner và TypeScript hiện có, không thêm dependency. `build` chạy cả TypeScript và test trước khi tạo `dist/`.

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

## Shop UI — Product Listing Page

Trang mới ở `/products`; trang chủ `/` và các luồng tài khoản/giỏ/đơn hàng vẫn được giữ.
Navigation và tìm kiếm trên header dẫn tới PLP. Không thay đổi API hay schema backend.

- Đọc trực tiếp dữ liệu E-commerce của `.agents/skills/ui-ux-pro-max`, không cần Python.
  Bản thiết kế và nguồn CSV được lưu tại `design-system/shop-ui/MASTER.md`,
  quy tắc riêng của trang tại `design-system/shop-ui/pages/product-listing.md`.
- Theo lựa chọn mới của người dùng, PLP đã chuyển từ xanh mint sang hướng
  **biên tập cao cấp, nhiều khoảng thở**: ivory, chữ than đậm, nhấn đất nung;
  tiêu đề Lora serif/italic và nội dung Be Vietnam Pro hiện có. Lora hỗ trợ
  tiếng Việt, phục vụ WOFF2 local kèm `public/fonts/lora-OFL.txt`. Font cũ và
  giấy phép được giữ nguyên. Override thiết kế nằm trong tài liệu page ở trên.
- Header/footer đồng bộ màu chỉ khi đang ở trang `/products`; các màn hình
  khác không bị đổi theme hoặc logic. Khung ảnh biên tập không đại diện sản
  phẩm thật; thẻ sản phẩm luôn lấy ảnh từ API.
- URL lưu `q`, `category`, `sort`, `page` (bắt đầu từ 0) và `view=list`.
  Thay từ khóa/danh mục/sắp xếp đưa về trang đầu; đổi lưới/danh sách giữ trang.
  Back/reload giữ lựa chọn; xóa lọc không xóa sắp xếp hoặc kiểu hiển thị.
- Trên điện thoại, bộ lọc là bản nháp. Chỉ nút **Áp dụng bộ lọc** cập nhật URL;
  đóng hoặc Escape hủy nháp và trả focus về nút mở. Danh sách đã lưu dùng kho
  local hiện có, không phải wishlist đồng bộ tài khoản.
- Giá, danh mục, phiên bản và ảnh từ API thật. Không có đánh giá/giảm giá/tồn kho
  giả, không lọc giá hay sắp xếp giá khi backend chưa hỗ trợ. Giá “Từ” chỉ tính
  giữa các phiên bản có cùng tiền tệ. Mỗi trang 12 sản phẩm; chọn SKU tại trang chi tiết.
- Có tải, lỗi/thử lại, không có kết quả và phục hồi trang quá cuối. Hỗ trợ theme tối,
  focus nhìn thấy được và `prefers-reduced-motion`; không thêm thư viện runtime.

Kiểm tra local ngày 16/10/2026: 18/18 test, TypeScript và Vite build đạt; lọc danh
mục âm thanh trả 3 sản phẩm QA, tìm “tai nghe” trả 2, tên A–Z đúng thứ tự;
reload/Back, lưu/bỏ lưu, lọc nháp/áp dụng/Escape, trang rỗng và trang quá cuối
được kiểm tra. 375×812, 768×1024, 812×375 và 1440×1000 không tràn ngang;
theme tối được xem trực tiếp. Kiểm tra mất kết nối dùng một dev proxy riêng,
không dừng backend. QA dùng 8 sản phẩm có sẵn trong schema riêng, không seed
schema `shop`, không checkout hay thanh toán. Nhiều trang và biên giá/URL được
kiểm tra bằng unit test; chưa có hơn 12 sản phẩm để nghiệm thu phân trang nhiều
trang trên API thật. Reduced motion được kiểm tra trong source, chưa mô phỏng
thiết lập OS/trình duyệt. Đây không phải chứng nhận WCAG hay kiểm thử bảo mật.

Nhánh review PLP là `codex/shop-ui-product-listing`; chưa merge main hoặc deploy.
Chạy `npm run dev`, mở
`http://localhost:5173/products` với backend như hướng dẫn ở trên. Preview QA
riêng nếu đang chạy là `http://127.0.0.1:5174/products`.

Vòng chỉnh editorial theo phản hồi người dùng: 18/18 test, TypeScript/Vite build
và `git diff --check` đạt. Đã xem trực tiếp sáng/tối và kiểm tra lại tìm kiếm,
danh mục/sắp xếp, lưới/danh sách, Back/reload, lọc nháp/Apply/Escape, trạng thái
không có kết quả và liên kết sang chi tiết. Các viewport 375×812, 768×1024,
812×375, 1440×1000 không tràn ngang. Tên sản phẩm và ô tìm kiếm mobile là 16px;
nút lưu 44×44px. Trang chủ/chi tiết giữ giao diện trước đó. Chưa đo LCP hay
chứng nhận WCAG; không thay đổi hay nghiệm thu lại thanh toán trong vòng UI này.

## UI-PLP-02 — Motion và chuẩn bị xuất bản, 18/10/2026

Tiếp tục bản editorial theo `.agents/skills/ui-ux-pro-max`; không thiết kế lại
trang chủ, checkout hoặc các màn hình tài khoản. Hợp đồng tám phần ở
`design-system/shop-ui/pages/product-listing.md`.

- Hero copy/caption xuất hiện nhẹ; ảnh hero và sản phẩm không bị giấu để chờ
  JavaScript/animation. Dialog và thông báo lưu có chuyển động ngắn, không
  trì hoãn đóng/Escape hoặc cập nhật bộ lọc.
- Icon lưu có phản hồi khác nhau khi lưu/bỏ lưu. Click tiếp hủy animation cũ;
  hủy cả khi đổi tùy chọn giảm chuyển động hoặc unmount. Trạng thái lưu không
  phụ thuộc animation kết thúc. Không thêm thư viện animation runtime.
- CSS motion opt-in theo `prefers-reduced-motion: no-preference`; chế độ
  giảm chuyển động tắt cả backdrop. Hiệu ứng zoom ảnh chỉ cho chuột hỗ trợ hover.
- Bộ lọc đóng cập nhật trạng thái ngay, không để sự kiện close cũ làm sai một
  lần mở mới; tác vụ cuộn bằng requestAnimationFrame được cleanup khi đổi route.
  Đổi/bỏ lọc sau liên kết tới catalog không ép cuộn trở về đầu trang.
- 26/26 test, TypeScript, Vite production build và diff check đạt. Đã kiểm tra
  API QA thật: lưu/bỏ lưu (khôi phục trạng thái cũ), danh mục/sắp xếp, tìm kiếm
  không kết quả, Back/reload, lưới/danh sách, nháp/Apply/Escape/trả focus, route
  chi tiết và đăng nhập. Không đăng nhập hoặc checkout/thanh toán trong lượt này.
- Đã xem sáng/tối và các viewport 375×812, 768×1024, 812×375, 1440×1000,
  không thấy tràn ngang; nút lưu 44×44px. Landscape dialog nằm trong viewport
  và nút Apply vẫn tiếp cận được. Preference JS có unit test; CSS được review,
  chưa mô phỏng giảm chuyển động ở cấp OS/trình duyệt hoặc chứng nhận WCAG/LCP.
- Backend QA chỉ bind loopback, dùng schema `shop_ui_qa_20261015` và bucket
  `shop-ui-review-20261015` có sẵn. Flyway nâng riêng QA V24→V25 khi chạy JAR
  hiện hành. Không seed/chuyển/xóa ảnh, không sửa dữ liệu schema `shop`, không
  sửa code backend. Payment provider `none`, refund/auto-initiation tắt.

### Dependency audit trước khi xuất bản

React Router được pin từ 6.28.0 lên **6.30.6**, router lõi 1.23.4, cùng major
v6 và cùng BrowserRouter. Lockfile được cập nhật, test/build chạy lại đạt.
`npm audit --omit=dev --audit-level=high` không còn high/critical, nhưng **vẫn
còn 2 moderate dependency findings**; exit 0 của lệnh này không phải zero findings.

Các advisory đã xử lý theo version:
[GHSA-2w69-qvjg-hvjx](https://github.com/advisories/GHSA-2w69-qvjg-hvjx),
[GHSA-2j2x-hqr9-3h42](https://github.com/advisories/GHSA-2j2x-hqr9-3h42).
Maintainer loại trừ Declarative/BrowserRouter khỏi hai luồng bị ảnh hưởng;
không kết luận ứng dụng hiện tại đã bị khai thác từ kết quả audit.

Hai advisory còn lại:
[backslash navigation](https://github.com/advisories/GHSA-wrjc-x8rr-h8h6),
[SSR hydration](https://github.com/advisories/GHSA-337j-9hxr-rhxg).
Ứng dụng không SSR/hydrate Router errors; điều hướng vẫn cần đánh giá input
không tin cậy. Bản vá được advisory công bố thuộc v7.18+, nên nâng major Router
và nghiệm thu auth/return URLs là task riêng trước production. Không chạy
audit fix --force hoặc coi scope UI này là security sign-off toàn dự án;
dev-toolchain audit, CI/CD và deploy vẫn còn riêng.

Xuất bản chỉ source UI đã review trên feature branch; không đưa `.agents/`,
secret, `node_modules`, `dist`, log hoặc backend vào commit. Không merge main
hay kích hoạt deploy trong task này.

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
