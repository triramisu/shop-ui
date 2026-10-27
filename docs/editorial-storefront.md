# UI-EDITORIAL-02 — làm lại cửa hàng Aydibro

Ngày 27/10/2026. Source ở `D:/shop-ui`, nhánh đang có draft
`codex/retail-storefront-refresh`. Bảo toàn skill người dùng cài và bản sửa dở;
lưu bản dự phòng trước khi thay tại thư mục tooling tạm của máy. Không reset
hoặc trộn thay đổi backend vào nhiệm vụ UI.

## 1. Mục tiêu và phạm vi

Người mua duyệt cửa hàng âm thanh với ảnh lớn, ít chi tiết trang trí, thẻ sản
phẩm phẳng và điều hướng rõ. Tham khảo nhịp ảnh/lưới của
[Belledonne](https://belledonne.com/en), áp dụng quy tắc trong skill
`.agents/skills/idk/SKILL.md` (A-dam): navy/trắng, cobalt hạn chế, nút pill,
không đổ bóng hoặc bo tròn thẻ hàng. Thương hiệu/sản phẩm vẫn là Aydibro.

Đổi trang chủ, khung header/footer, tìm kiếm/menu, PLP và phần nhìn của chi
tiết/auth/giỏ/checkout. Không sửa API, schema, token, ownership, payment,
workflow, lockfile, IAM hoặc WAF; không tạo/đổi hàng hóa, order hoặc tài khoản.

## 2. Dependency và quyền sở hữu dữ liệu

React18/TypeScript/Vite/Query/Router và CSS hiện hữu. Font Be Vietnam Pro local
được giữ để hỗ trợ tiếng Việt thay cho font GT Walsheim chưa có giấy phép/file.
Không thêm runtime dependency. Homepage dùng query key riêng và size8, tách
với listing size12. Giá/phiên bản/ảnh hàng hóa tiếp tục do Catalog API sở hữu.

## 3. Luồng và bất biến

- Trang chủ → danh mục hoặc toàn bộ → chi tiết → chọn phiên bản/số lượng →
  đăng nhập nếu cần → giỏ/checkout hiện hữu.
- URL home cũ có q/category/sort/page/view chuyển sang `/products` và giữ query.
- PLP giữ tìm kiếm, sort, danh mục, pagination, grid/list và draft filter.
- Category label rút gọn cho navigation; không đổi ID, dữ liệu API hay tên hàng
  DEMO. Không tự gắn nhãn bán chạy/giảm giá/còn hàng hoặc thông số không có API.
- Menu/search dùng native dialog: Escape, giữ focus trong dialog và trả focus.
  Dialog đóng phải display:none để không bị CSS mobile cũ hiển thị trở lại.

## 4. UX, an toàn và ảnh

Không popup sales, newsletter giả, rating giả, carousel tự chạy hay scroll-jack.
Focus rõ, control44px, reduced-motion, filter landscape có thể cuộn. Form/auth
và xử lý CAPTCHA/token hiện hữu được giữ. Không ghi secret vào VITE_*.

Ảnh mới là ảnh biên tập hư cấu, không phải ảnh sản phẩm thật. Ảnh hàng hóa chỉ
lấy từ response Catalog API. [Nguồn và prompt ảnh mới](../public/images/ATTRIBUTION.md).

## 5. Đầu ra

- `src/components/Navbar.tsx`: logo giữa, category, utility icons, native dialogs.
- `src/components/RetailHero.tsx`, `src/pages/CatalogPage.tsx`: hero ảnh full-bleed,
  tám sản phẩm mới, danh mục, hai khối biên tập và phần giới thiệu.
- `src/styles/retail.css`: token navy/trắng/cobalt, các surface và responsive.
- Layout/AuthShell/PLP/index metadata: đồng bộ visual; không thay business API.
- `public/images/everyday-listening.webp`:1536×1024,185318bytes; ảnh gốc built-in
  imagegen, WebP chỉ đổi định dạng/nén phục vụ web.
- Design contract tại `design-system/shop-ui/pages/editorial-storefront.md`.
- Fixture/test/ảnh QA ở `tests/fixtures/`, `tests/storefront-presentation.test.mjs`
  và `docs/previews/`; fixture không được đưa vào bản build.

## 6. Nghiệm thu chức năng và giới hạn

Đã kiểm browser local bằng fixture GET-only có nhãn DEMO vì API production
đang trả502/503 ở thời điểm kiểm tra; không bật EC2, sửa ALB hoặc sửa dữ liệu.

- Search header “Air” trả3 sản phẩm fixture; menu mở/Escape/trả focus đạt.
- Chọn Không dây giữ NAME:DESC/view=list trong URL; chỉ đúng pill active.
- Filter chọn Studio chưa đổi URL trước Apply; Apply đổi đúng category và giữ
  sort/view. Save/un-save trả saved count về0.
- Chi tiết chọn Kem và qty2 giữ trong query; anonymous mua chuyển về login.
  Không submit credential, tạo đơn hoặc gọi VNPay để kiểm tra giao diện.
- Bốn khung CSS375/768/812/1440 lần lượt có client width360/753/797/1425 do
  scrollbar; scrollWidth bằng clientWidth, không tràn trang. Đây là iframe CSS,
  không giả là thiết bị mobile vật lý hoặc emulation toàn bộ trình duyệt.
- Có xem bản desktop/mobile; đã sửa conflict position của password eye và
  dialog đóng bị CSS cũ hiện lại. Control mobile giữ tối thiểu44px.
- Search không khớp hiển thị empty state; fixture503 hiển thị lỗi và Retry giữ
  q/sort/view. Dark chuyển đúng token, sau QA đã trả về light; không ghi thay
  đổi sản phẩm hoặc phiên người dùng.
- PLP/detail/login kiểm lại375/768/1440, không tràn ngang; nút hiện mật khẩu
  position:absolute,44×44px. Chưa dùng tài khoản thật để nghiệm thu giỏ/checkout;
  các luồng này giữ xử lý hiện hữu và regression Node.

Không coi build xanh hoặc fixture là nghiệm thu kết nối production/WCAG đầy đủ,
Core Web Vitals, đăng nhập thực hay thanh toán thực.

## 7. Build và kiểm tra local

Dừng Vite trước `npm ci` trên Windows để esbuild.exe không bị khóa. Một lần
ci đầu đã gặp EPERM do preview còn chạy; dừng đúng server rồi chạy lại đạt.

```powershell
cd D:/shop-ui
npm ci
npm run build
npm audit --audit-level=moderate
git diff --check
```

`npm ci` và `npm run build` đạt: TypeScript,94/94 Node tests, không skip,
Vite production build. `npm audit --audit-level=moderate`:0 vulnerability.
Entry JS302.66KB (gzip94.81KB), entry CSS70.42KB (gzip13.77KB), PLP lazy
JS16.53KB/CSS26.38KB. Đây là dung lượng build, không phải kết quả Core Web Vitals.

Ảnh review được chụp từ browser/iframe fixture rồi chỉ cắt phần toolbar QA:
[desktop1440×1700](previews/editorial-desktop.png),
[mobile375×812](previews/editorial-mobile.png). Không dựng ảnh giả thay UI.
Hai file ảnh này sau đó đã được cập nhật bởi
[UI-COMMERCE-03](commerce-refinement.md) bằng Catalog đã deploy, sau khi chủ
dự án bật lại ASG; mô tả fixture bên trên là biên bản của lượt kiểm tra đầu.

Xem với dữ liệu fixture (hai terminal, chỉ loopback):

```powershell
# Terminal 1
cd D:/shop-ui
# Optional: ảnh fixture từ source MIT đã có trên máy. Không copy vào dist.
$env:SHOP_QA_IMAGE_ROOT='D:/ui/public'
node tests/fixtures/storefront-preview.mjs
```

```powershell
# Terminal 2
cd D:/shop-ui
$env:VITE_DEV_API_TARGET='http://127.0.0.1:5191'
npm run dev -- --host 127.0.0.1 --port 5190 --strictPort
```

Mở `/` hoặc `/tests/fixtures/retail-review.html`. Fixture chỉ GET Catalog,
trả405 với mọi POST/PUT/DELETE, không có credential hay token. Không có nhánh
fallback fixture trong app. Đổi target dev về backend của bạn để dùng dữ liệu
thật; env production giữ `/api` và Vite xuất `dist/`.

## 8. Lưu S3, Gateway Endpoint và phát hành

Hai đường đi có actor khác nhau:

```text
Banner/UI: browser → CloudFront → OAC → S3 UI private
Sản phẩm:  EC2 private → S3 Gateway Endpoint → S3 sản phẩm private
           browser ← URL ảnh ký tạm từ Catalog API → HTTPS S3
```

Gateway Endpoint là tuyến mạng trong route table, không phải domain ảnh để gắn
vào React. Không dùng địa chỉ `vpce-*` làm VITE_API_BASE_URL, không thêm endpoint
URL tùy ý và không public bucket. Đọc ảnh từ browser/CloudFront không đi qua
VPC endpoint; không áp bucket Deny ngoài VPCE một cách mù quáng làm hỏng hai luồng.

Đã đọc lại endpoint `vpce-0a0fea441090f170f`: Gateway/available,
`com.amazonaws.ap-southeast-1.s3`, gắn ba route table. Không thay route/policy.
Đây là xác nhận cấu hình, không phải trace mới chứng minh request EC2 cụ thể.

Theo yêu cầu lưu ảnh S3, chỉ upload object **mới**, head-object trước đó404:

```powershell
aws s3api put-object --profile shop-prod --region ap-southeast-1 `
  --bucket shop-aydibro-prod-uibucket-muvncutg3vyi `
  --key images/everyday-listening.webp `
  --body public/images/everyday-listening.webp `
  --content-type image/webp --cache-control 'public,max-age=300' `
  --server-side-encryption AES256 --checksum-algorithm SHA256 `
  --expected-bucket-owner 233377400170
```

Lệnh trên chạy từ máy local đến API S3, không tuyên bố đi qua VPC endpoint.
Bucket vẫn private, không thêm ACL/policy/quyền. Không upload index hoặc thay
website. Object version `7a_VsohF0zYY8_XHD.vGwy.1Hpv2GGiJ`, AES256,
SHA256 `AE49554F8C441CF3C905E8BE2B259BAE8D2BE83CF8FA51C225BD7660A3F6F38E`.
GET `https://aydibro.click/images/everyday-listening.webp` trả200/image/webp;
download checksum khớp. Không tạo invalidation vì đây là key mới.

Phát hành bản UI mới sau review: selective diff (không `.agents/`, dist hoặc
env local) → commit → push feature → PR → verify/dependency-review xanh → merge
main → pipeline hiện hữu upload static trước/index sau → invalidation → HTTPS
smoke. [Runbook CI/CD UI](ui-cicd.md). Main auto deploy thật; không upload
thủ công bundle để bỏ qua pipeline. Lỗi API 502 được ghi nhận trước khi chủ
dự án bật lại ASG; lần nghiệm thu UI-COMMERCE-03 đã đọc lại Catalog trả 200.

Rollback UI bằng artifact đã nghiệm thu trước theo runbook, không rollback DB,
xóa hàng hóa hoặc tắt WAF. Ảnh S3 có versioning; giữ object để các bundle
đã phát hành có thể tải lại và rollback không bị thiếu ảnh.
