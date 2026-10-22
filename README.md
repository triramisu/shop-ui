# Aydibro storefront

React 18 + TypeScript + Vite, sử dụng API thật của Shop. Thiết kế riêng theo hướng editorial: nền kem, chữ đậm, màu đất nung, ảnh có khoảng thở và bố cục gọn. Không dùng layout/template của hai dự án tham khảo.

## Quy trình từng nhiệm vụ UI — cùng quy trình backend

README là nguồn tiến độ chính thức; đối chiếu thêm code, test, Git và CI đúng
commit. Mỗi lượt chỉ làm một nhiệm vụ với hợp đồng tám phần: mục tiêu/phạm vi,
sở hữu/đầu vào, luồng/bất biến, bảo mật/vận hành, đầu ra, ca kiểm thử, gate và
phát hành/rollback. Không coi “build local đạt” là đã merge hoặc deploy.

1. Đọc README/runbook, status/history và code/test liên quan; bảo toàn thay đổi
   của người dùng. Bắt đầu nhánh task từ main đã đồng bộ, không sửa thẳng main.
2. Review đúng phạm vi, chạy `npm ci`, TypeScript/full test/build, dependency
   audit và diff/secret review. Không giảm assertion/severity để qua gate.
3. Commit tiếng Việt, chỉ stage file đã review; push nhánh và mở PR vào main.
   `.agents/`, secret, file env local, dist và node_modules không được commit.
4. Chờ **verify + dependency-review** đạt trên head SHA mới nhất, review diff/
   phản hồi rồi mới merge. Không force-push main, bypass protection hoặc merge
   khi check pending/failed. Check của commit cũ không chứng minh head mới đạt.
5. Chờ CI đúng merge commit trên main xanh; dependency-review có thể skipped
   trên push vì chỉ chạy cho pull_request. Sau đó đồng bộ main local bằng
   fast-forward, xác nhận HEAD=origin/main, build lại rồi mới dọn nhánh đã merge.
6. Ghi PR/SHA/CI, số test, giới hạn và rollback vào README/runbook. Nếu cập nhật
   tài liệu sau nghiệm thu cần commit mới, tài liệu cũng qua PR/CI, không push
   thẳng main. Kết thúc nhiệm vụ; chỉ bắt đầu việc tiếp khi được yêu cầu.

Lệnh mẫu chạy trong **PowerShell tại D:/shop-ui**, thay placeholder bằng nhánh/
file của task thực tế. Kiểm tra status trước switch; nếu còn thay đổi chưa lưu,
không reset hoặc switch đè. CLI GitHub chỉ dùng nếu đã cài và đăng nhập; có thể
mở/review/merge PR trên GitHub bằng cùng các điều kiện trên.

```powershell
git status --short --branch
git fetch origin --prune
git switch main
git pull --ff-only origin main
git switch -c codex/ten-nhiem-vu
npm ci
npm run build
npm audit --audit-level=moderate
git diff --check
git diff
git add -- FILE_DA_REVIEW_1 FILE_DA_REVIEW_2
git diff --cached --check
git diff --cached
git commit -m "Mô tả tiếng Việt rõ mục đích"
git push -u origin codex/ten-nhiem-vu
```

Sau PR/required checks/merge và CI main đạt mới chạy phần đồng bộ này:

```powershell
git fetch origin --prune
git switch main
git pull --ff-only origin main
git rev-parse HEAD
git rev-parse origin/main
npm ci
npm run build
npm audit --audit-level=moderate
git branch -d codex/ten-nhiem-vu
```

Xóa nhánh remote qua nút Delete branch của PR hoặc lệnh Git sau khi kiểm nó
không có commit chưa merge. Không xóa nhánh công việc khác. Nguồn đã merge
không tự lên S3: upload/invalidation và browser smoke website là nhiệm vụ
phát hành riêng, không tự đổi AWS/DNS/backend/payment khi chỉ merge UI.

## Build production cho CloudFront và S3 — UI-REL-01

Nguồn phát hành là **main của repo UI**, không phải main backend. Release này
gom PLP editorial/motion, phần UI VNPay đã kiểm thử local và tách env dev/prod;
không đồng nghĩa đã upload AWS, bật provider thanh toán hoặc nghiệm thu go-live.
Xem [hợp đồng, gates và rollback](docs/main-release.md). Các mục theo ngày bên
dưới là lịch sử bàn giao, không phải trạng thái publish hiện tại.

Nghiệm thu nguồn phát hành ngày **21/10/2026**: [PR #1](https://github.com/triramisu/shop-ui/pull/1)
đã merge PLP và UI payment vào commit chức năng `2f103a3` trên main.
[CI của commit main](https://github.com/triramisu/shop-ui/actions/runs/39628199286)
báo **Success**: TypeScript, **67/67 test**, build production và full dependency
audit đạt, không có test bị bỏ qua. PR có cả verify/dependency-review đạt;
dependency-review được skip có chủ ý trên event push main. Đã pull fast-forward
và chạy lại `npm ci`, `npm run build`, audit trên main local thành công.
Các commit ghi nhận tài liệu sau đó không thay đổi code ứng dụng.

Hậu kiểm truy cập **22/10/2026 — DNS-01**: sau lần upload của chủ repo, đã
thêm apex DNS tới CloudFront và bổ sung IP website qua CloudFormation.
Domain thật trả 200 cho UI, JS/CSS và API catalog; S3 vẫn private. Catalog
hiện trả 0 sản phẩm; tại bước DNS-01 website vẫn giới hạn IP, chưa nghiệm thu payment/go-live.
Xem [hướng dẫn từng thao tác, chẩn đoán và rollback](docs/domain-access-recovery.md).
**Cập nhật 08:34:11 ngày22/10 — AWS-PUBLIC-01:** sau approval riêng, đã chuyển
CloudFormation ViewerAccessMode=public, bỏ allowlist IP website; SSH, S3/RDS,
auth backend và WAF không bị mở rộng. API riêng tư không token vẫn401, S3 trực
tiếp vẫn403; WAF hiện Count, chưa chặn flood. Không thay bundle hoặc bật payment.
Tài liệu DNS này được review cùng đợt phát hành UI-NAV-01; không chạy lại các
thao tác AWS/DNS khi xuất bản tài liệu. Những kết quả catalog rỗng phía trên
là lịch sử DNS-01, không phải hiện trạng sau lần nạp DEMO.

**UI-NAV-01 — sửa active danh mục,22/10/2026:** thanh điều hướng dùng chung
`CatalogNavLink` cho desktop và mobile, lấy category từ URL bằng đúng parser
của PLP. Chọn danh mục chỉ làm nổi bật danh mục đó; Tất cả sản phẩm chỉ active
khi không có category hợp lệ. Thêm `aria-current=page` cho mục đang chọn;
q/sort/page/view không làm mất lựa chọn. Không còn NavLink chỉ khớp pathname
cho liên kết Tất cả sản phẩm. TypeScript +75/75 test (8 regression mới) +Vite
production build đạt. Browser local đã kiểm đổi danh mục, Back/reload và theme
tối; không thay backend/API/schema hoặc dữ liệu DEMO.
Đã merge qua [PR #3](https://github.com/triramisu/shop-ui/pull/3) lúc16:10:48
ngày22/10/2026 (UTC+7), merge commit `cd9ec8602938e2d5b465da954a4bf94b06a5047b`.
[CI PR](https://github.com/triramisu/shop-ui/actions/runs/39753274440) có verify
và dependency-review success trên head `8b5c8bf`; [CI merge commit main](https://github.com/triramisu/shop-ui/actions/runs/39753409599)
cũng Success: Node22/75 test,0 fail/skip, build và audit0; dependency-review
skipped đúng điều kiện push. Đã fast-forward main local=origin/main, chạy lại
npm ci/build/audit đạt và dọn đúng nhánh task đã merge; `.agents/` giữ nguyên.
Tài liệu ghi nhận sau nghiệm thu cũng được đưa qua PR/checks, không push main.
`D:/shop-ui/dist` đã build từ main; **chưa upload bundle mới lên S3 hoặc
invalidation CloudFront**, nên website vẫn dùng bundle trước. Xem
[nguyên nhân, bằng chứng, gate và bước phát hành](docs/catalog-navigation-active.md).

Bạn có thể build từ main theo lệnh bên dưới. Kết quả ở `D:/shop-ui/dist` nếu
clone/build tại đường dẫn này. Nhiệm vụ UI-REL-01 chỉ nghiệm thu nguồn release,
không tự upload bundle, đổi DNS, deploy backend hoặc bật payment. Hậu kiểm
DNS-01 bên trên ghi nhận website/API sau lần upload của chủ repo. Nếu gặp lỗi
API, kiểm tra Network/health backend; không sửa bundle để trỏ về localhost
và không mở public S3/RDS để chữa lỗi.

| Chạy lệnh | File public được Vite nạp | API trên trình duyệt | Proxy backend |
|---|---|---|---|
| npm run dev | .env.development | /api | localhost:8080, chỉ ở máy dev |
| npm run build | .env.production | /api trên cùng domain CloudFront | Không có dev proxy trong cấu hình production |

`.env.production` được theo dõi trong Git vì **chỉ có cấu hình công khai**:

```dotenv
VITE_API_BASE_URL=/api
VITE_PAYMENT_ALLOWED_ORIGINS=https://aydibro.click
```

Website gọi `https://aydibro.click/api/…`; CloudFront chuyển `/api/*` sang ALB.
Không đặt `shop.aydibro.click`, IP EC2, private IP, RDS hoặc S3 endpoint vào
API UI. Allowlist payment chỉ cho mở handoff HTTPS do backend phát hành đúng
origin; không tự bật VNPay hoặc xác nhận tiền. Khi đổi hostname của
VNPAY_PUBLIC_BASE_URL phải review allowlist và build lại. Không nhập merchant
secret, JWT key, DB password hoặc AWS credentials vào bất kỳ biến VITE_* nào.

Clone sạch để build sau khi PR release đã merge vào main:

```powershell
git clone --branch main https://github.com/triramisu/shop-ui.git
cd shop-ui
npm ci
npm run build
```

Nếu đã có repo **đang ở main và không có thay đổi chưa lưu**, dùng
`git pull --ff-only` trước `npm ci`. Không reset hoặc switch bỏ thay đổi local.
Vite nhúng env lúc build; chỉnh env trên EC2/S3 sau build không sửa bundle.
Override trong shell hay `.env.production.local` vẫn phải qua build guard:
production chỉ nhận `/api`, build sai mode/localhost/absolute API sẽ lỗi rõ
ràng thay vì xuất một bundle trỏ nhầm máy cá nhân. `.env.local` vẫn dành cho
dev; không commit file override thật.

Build tạo **dist/index.html**, **dist/assets**, ảnh/font công khai. Upload
**nội dung bên trong dist** lên đúng S3 UI bucket private, không upload cả
repo, node_modules, env hay một tầng thư mục dist lồng thêm. CloudFront dùng
OAC đọc bucket; không bật S3 website/public để chữa403. Giữ `/api/*` không
cache, SPA fallback chỉ rewrite route UI, không đổi lỗi API thành index.html.
Sau upload cần kiểm cache/invalidation, mở trực tiếp `/products` rồi reload,
kiểm tra Network có request `/api/catalog/products`, không localhost.
Không chạy `npm run dev`/React server trên S3 và không cần Docker UI cho mô
hình S3/CloudFront này. Nhiệm vụ UI-REL-01 không tự chạy upload/DNS/invalidation;
DNS-01 ở trên ghi nhận riêng đợt sửa truy cập sau upload.

React Router được nâng lên7.18.4 để xử lý hai moderate runtime advisory;
giữ React18/BrowserRouter và kiểm regression auth/navigation. CI mới chỉ
chạy **verify + dependency-review**, không có deploy job, secret AWS hoặc
tự upload S3. Xem kết quả đúng commit/PR trên GitHub Actions; build pass
không thay thế kiểm thử mua hàng/VNPay SIT hoặc kiểm toán bảo mật toàn dự án.
Vite được nâng6.4.4 để xử lý cả dev-toolchain findings; plugin React4.3.4 hỗ
trợ Vite6. Không bật CORS/allowedHosts wildcard hoặc audit fix --force.

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
VITE_PAYMENT_ALLOWED_ORIGINS=
```

- `VITE_DEV_API_TARGET` chỉ dùng cho proxy dev. Khởi động lại Vite khi đổi biến này.
- `VITE_API_BASE_URL` được nhúng vào bundle khi build. Không đưa secret/token vào biến `VITE_*`.
- `VITE_PAYMENT_ALLOWED_ORIGINS` là danh sách origin HTTPS backend được tin cậy, phân cách bằng dấu phẩy, ví dụ `https://api.example.com`. Chỉ điền hostname backend thật sau khi đã có HTTPS; không điền domain VNPay, URL có path, wildcard hoặc merchant secret. Để trống vẫn chạy dev/fake bình thường nhưng UI không mở link thanh toán.
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

CI phát hành được theo dõi tại [PR #1](https://github.com/triramisu/shop-ui/pull/1).
`npm test` dùng `node --test` để Node tự tìm các file `*.test.mjs`, tương thích
cả máy dev và Node 22 trên Ubuntu. Repo đã bật riêng Dependency graph để job
dependency-review đọc được lockfile; không bật tự nâng dependency hay CD.

Không commit `node_modules/`, `dist/`, `.env.local`/`.env.*.local` hoặc token.
Chỉ `.env.example`, `.env.development` và `.env.production` public được theo dõi.
`.gitattributes` giữ shell entrypoint ở LF để
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
| Thanh toán VNPay                | Trong chi tiết đơn: mở handoff backend HTTPS ở tab mới, kiểm tra kết quả có giới hạn; Order API là nguồn xác nhận đã thanh toán |
| Xác nhận                       | Checkout mở chi tiết theo ID; URL xác nhận cũ bridge tới API detail, không render snapshot tài khoản trước          |
| Hồ sơ                          | Thông tin thật của tài khoản, đăng xuất và xóa cache giỏ/báo giá khi đổi tài khoản                                  |

Mọi trang có trạng thái tải, rỗng hoặc lỗi phù hợp. Ảnh sản phẩm lỗi/thiếu dùng placeholder trung tính, không gán ảnh minh họa thành hàng hóa thật. Không thêm đánh giá, giảm giá hoặc tồn kho giả.

## Điểm cần biết trước khi phát hành

- Đây là storefront khách hàng, chưa phải dashboard quản trị.
- Đã nối hosted handoff VNPay ở WEB-PAY-01 local; chưa có SIT VNPay thực tế, refund UI hoặc địa chỉ giao hàng. Backend phải hỗ trợ GET `/api/orders`, `/api/orders/{orderId}` và `/api/orders/{orderId}/payment` theo ownership. Không thêm Stripe UI.
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

`lint` kiểm tra TypeScript cho cả ứng dụng và cấu hình Vite, không sinh JS cạnh source hoặc sửa build artifact đang được Git theo dõi. Cache TypeScript của cấu hình nằm trong `node_modules/.tmp/`. `test` dùng Node built-in test runner để kiểm PLP/motion/session, UI payment và build environment; số test của từng lần nghiệm thu nằm trong biên bản. `build` chạy cả TypeScript và test trước khi tạo `dist/`. Dùng Node>=20 (CI/Docker dùng22); `npm ci` theo lockfile, không fallback sang npm install khi lockfile lỗi.

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

Ở mốc bàn giao PLP16/10, nhánh review là `codex/shop-ui-product-listing`;
trạng thái release hiện hành được theo dõi tại UI-REL-01/PR, không lấy mốc cũ
làm bằng chứng main hiện tại chưa có PLP. Deploy AWS vẫn là bước riêng.
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

## WEB-PAY-01 — UI VNPay, 19/10/2026

Trang `/orders/:orderId` có panel thanh toán từ API riêng tư
`GET /api/orders/{orderId}/payment`. Nút VNPay chỉ hiện khi đơn `PENDING`,
provider `VNPAY`, attempt `REQUIRES_ACTION` và URL qua kiểm tra an toàn.
Link phải là HTTPS/443, exact origin trong allowlist, đúng path
`/api/payments/checkout/vnpay/start`, UUID trùng attempt và token 128 ký tự hex;
không chấp nhận userinfo, fragment, query thừa hoặc hostname gần giống.
Tab thanh toán dùng `noopener noreferrer`. Không lưu URL này vào localStorage,
analytics hay log; cache payment riêng tư được bỏ khi rời trang/đổi phiên.

Order API là nguồn xác nhận: provider `SUCCEEDED` nhưng đơn còn `PENDING`
vẫn là “Đang xác nhận đơn hàng”. Query/flag trên URL không xác nhận thanh toán.
Trang không tạo lại đơn/attempt, không tự dọn giỏ và không tự đổi trạng thái tiền.
Mỗi đợt tự kiểm tra tối đa 12 payment GET trong 60 giây, không polling nền,
không tự retry lỗi auth/mạng/429/5xx. Chỉ lỗi chưa có attempt (404/code 1407)
được chờ tiếp. Nút “Kiểm tra thanh toán” mở đợt đọc mới có giới hạn.

### Cấu hình và đóng gói

Thiết lập `VITE_PAYMENT_ALLOWED_ORIGINS` **trước khi build**, bằng đúng
`VNPAY_PUBLIC_BASE_URL` của backend. Ví dụ `https://api.example.com` là
placeholder, không phải endpoint đã deploy. Nếu UI/backend cùng domain,
allowlist vẫn phải ghi origin HTTPS thật một cách tường minh.
Restart Vite khi đổi `.env.local`; build lại bundle khi đổi origin production.
Không thể truyền biến này chỉ bằng `docker run --env-file` sau khi đã build SPA.
Dockerfile đã nhận build argument công khai tương ứng:

```sh
docker build --build-arg VITE_PAYMENT_ALLOWED_ORIGINS=https://api.example.com -t shop-ui:local-vnpay .
```

Lệnh trên là hướng dẫn build, không phải bằng chứng image UI đã được build/push.
`npm run build` tạo `dist/`; bundle UI độc lập với JAR/image backend đã có.
Rollback bằng bundle/image UI trước đó, không migration hoặc sửa dữ liệu tiền.

### Kiểm thử có thể chạy lại, không dùng merchant thật

```powershell
# Terminal 1: API giả lập chỉ bind loopback, không DB hoặc cổng thanh toán.
node tests/fixtures/payment-api.mjs
# Terminal 2: Vite QA, không đổi .env.local của người dùng.
$env:VITE_DEV_API_TARGET='http://127.0.0.1:4192'
$env:VITE_PAYMENT_ALLOWED_ORIGINS='https://api.example.test'
npm run dev -- --host 127.0.0.1 --port 5176 --strictPort
```

Mở `http://127.0.0.1:4192/__qa`, dùng tài khoản fixture ghi trên trang.
Đóng mọi trang/iframe QA trước khi reset bộ đếm và đo một chu kỳ mới; không
sửa source giữa lượt đo vì HMR/remount có thể tạo chu kỳ khác. Khung mobile
375×812 và landscape 812×375 là kiểm tra CSS responsive, không giả làm thiết bị thật.
Đây chỉ là API fixture cho chi tiết đơn, không phải môi trường kiểm thử cả cửa hàng.

- TypeScript, **59/59 Node test** (33 test payment/API/session mới) và Vite production build đạt; diff check không có lỗi whitespace. Không thêm dependency hoặc đổi lockfile.
- Browser đã kiểm tra ready, missing attempt, provider success/Order pending, Order paid, link giả mạo và lỗi 503. URL giả `vnp_ResponseCode=00&status=PAID` không đổi trạng thái đơn. Link đúng có `_blank`, `noopener noreferrer`, cao 48px; link sai không còn CTA.
- Chu kỳ QA mới duy nhất, không HMR/iframe/request cũ: 12 GET rồi UI dừng tự kiểm tra. Không reset counter khi chu kỳ cũ còn chạy để tránh trộn số đo giữa các lượt.
- Đã kiểm tra sáng/tối; desktop CSS viewport thực tế 1265px, responsive frame 375px (client 360px) và 812px (client 797px) không tràn ngang; kiểm tra nút bằng bàn phím. Viewport override của trình duyệt không áp dụng lên tab hiện tại, nên dùng iframe có kích thước thật để kiểm tra CSS, không báo đã test viewport 1440px.
- Panel không thêm animation, dùng semantic token và focus sẵn có; review reduced-motion CSS và các test motion cũ đạt. Chưa mô phỏng preference giảm chuyển động cấp OS/browser, không chứng nhận WCAG/performance từ smoke này.
- Backend/source/schema/image không đổi trong task UI. Bằng chứng backend trước vẫn là 537 test, line 91,17%, branch 70,20%; **không đạt mục tiêu cuối dự án branch >80%**, không lấy test UI để tăng số này.
- Chưa gọi VNPay thật, chưa có SIT/IPN public, refund/reconciliation hoặc UI return page. Backend return hiện trả JSON ở tab mới; khách giữ tab đơn để kiểm tra. API chưa có `expiresAt`, nên không tự đoán countdown; backend enforce hạn link và việc tạo attempt mới là task khác.
- Chưa commit/push/merge/CI/deploy; `.agents/` có sẵn không thuộc thay đổi ứng dụng. Còn các rủi ro dependency và các gate phát hành đã ghi phía trên, không coi local build là production sign-off.
