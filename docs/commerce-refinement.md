# UI-COMMERCE-03 — trau chuốt cửa hàng

Ngày 27/10/2026, tiếp tục UI-EDITORIAL-02 trên nhánh có draft hiện hữu. Phần
hạ tầng không nằm trong nhiệm vụ này; người dùng đã xác nhận bật lại ASG và
yêu cầu dừng điều tra lỗi API. Không đổi cấu hình hoặc tài nguyên compute.

## Hợp đồng nhiệm vụ

1. Actor: người mua duyệt/chọn sản phẩm. Mục tiêu: trang chi tiết, ảnh, form
   tài khoản và các bước mua dễ đọc và nhất quán hơn; giữ phong cách ảnh lớn,
   navy/trắng, nút pill, thẻ phẳng từ idk/Belledonne. Không thêm chính sách,
   thông số, rating hoặc khuyến mại không có dữ liệu.
2. Dữ liệu do Catalog/Cart/Identity/Order/payment API hiện hữu sở hữu. Không
   đổi API/schema/auth/token/env prod/dependency/CI/CD; giữ gate và các flow
   hiện hữu. Related dùng public GET cùng category, loại sản phẩm hiện tại.
3. Luồng: xem ảnh S3 → phóng to/Escape; chọn phiên bản thấy đúng giá → chọn
   số lượng → action mua hiện hữu. Progress chỉ biểu diễn bước giao diện,
   không tuyên bố thanh toán thành công.
4. Native dialog giữ focus/khóa scroll/trả focus, control 44px, image aspect
   ratio ổn định, reduced-motion. URL ảnh sản phẩm đến từ API; không lưu hay
   xuất presigned query/token vào log hoặc README.
5. Đầu ra: ProductPage/gallery/related, AuthShell tabs, PurchaseSteps dùng cho
   Cart/Checkout, CSS commerce, ảnh WebP tối ưu và biên bản/ảnh review.
6. Kiểm tra: desktop/mobile/landscape, phóng to/Escape, giá phiên bản/qty,
   related cùng danh mục, form/tab, lưu/bỏ lưu và trạng thái ảnh. Không tạo
   tài khoản/đơn hoặc thanh toán thật để review UI; cart/checkout giữ regression.
7. Gate: TypeScript + 94 Node regression + Vite, diff check, browser với Catalog
   đã deploy. Gate mới nhất ghi bên dưới; không suy diễn WCAG/CWV đầy đủ.
8. Rollback: review source trên feature branch và artifact UI trước khi phát
   hành qua PR và CI/CD. Lượt triển khai local chỉ thêm ảnh mới vào S3 UI, không đè
   index, chỉnh DNS/WAF, sửa data Catalog hoặc xóa ảnh cũ còn được release dùng.

## Skill và quyết định

- idk: palette navy/trắng, cobalt ở announcement, ảnh dẫn dắt, card không shadow.
- ui-ux-pro-max: search `product images responsive loading`, domain `ux`, trả
  Image Scaling/Responsive, Alt Text/Accessibility, Loading Indicators/Feedback.
  Dùng max-width/aspect ratio, alt có nghĩa và feedback ổn định; không đổi style
  đã chọn theo một palette ngẫu nhiên trong dataset.
- ui-styling: áp dụng composition, token, focus/keyboard và responsive; giữ
  React/CSS hiện hữu thay vì cài framework để thay phần nhìn.
- Ảnh editorial vẫn là ảnh biên tập hư cấu. Tên DEMO/description của Catalog
  thật vẫn được hiển thị; không biến chúng thành lời quảng cáo hàng bán thật.

## S3 và ảnh

Toàn bộ file ảnh trong `public/images/` được pipeline copy sang S3 UI và phục
vụ qua CloudFront/OAC. Kiểm tra lại ngày 27/10: cả 5 file trả HTTP 200, SHA256 khớp
với source local:

| File | Bytes |
| --- | ---: |
| audio-editorial.png | 241399 |
| audio-still-life-v1.webp | 142502 |
| desk-editorial.jpg | 30393 |
| everyday-listening.webp | 185318 |
| hero-audio.png | 2188019 |

Chỉ thêm object mới `images/audio-still-life-v1.webp`; AES256, checksum S3
`+My/Eit3ebr2NAA5NUw5sKU5R1MeGRQYOILMZBT1a6w=`, version
`x_kTFg.5j4BTCFuplavF1nYyegzz9cCn`. Bản mới dùng WebP này thay PNG ở PLP và
khối biên tập. PNG cũ giữ để không phá bundle production hiện tại. Không
chỉnh ACL/bucket policy hoặc tạo bucket mới. [Nguồn ảnh](../public/images/ATTRIBUTION.md).

Browser đã tải ảnh chi tiết từ host S3 bucket sản phẩm hiện có:
`shop-aydibro-prod-productimagesbucket-w3vlmgafeuw1.s3.ap-southeast-1.amazonaws.com`.
Không sao chép URL ký tạm đầy đủ vào source. Luồng backend EC2→Gateway Endpoint
→S3 giữ nguyên; browser tải URL ảnh qua HTTPS. Banner/UI đọc từ S3 UI qua
CloudFront, không đi qua endpoint VPC của EC2.

`/images/...` là đường dẫn trên origin website, không phải yêu cầu giữ ảnh trên
ổ đĩa EC2. Khi publish, nó trỏ tới object S3 UI. Source local giữ file để build
có thể tái tạo; không xóa file source rồi phụ thuộc upload tay.

## Trạng thái preview và API

Đã chuyển preview cổng 5190 từ fixture sang dev proxy `https://aydibro.click`, chỉ
đọc Catalog trong quá trình kiểm tra giao diện. API trả HTTP 200, các sản phẩm DEMO
Journey/Studio/Wireless thực tế lấy từ DB đã deploy. API private trả 401 khi
anonymous là đúng. Chủ dự án đã bật lại ASG/bastion; không tiếp tục điều tra,
thay hạ tầng hoặc khởi động/dừng AWS resource trong nhiệm vụ UI.

```powershell
cd D:/shop-ui
npm run build
$env:VITE_DEV_API_TARGET='https://aydibro.click'
npm run dev -- --host 127.0.0.1 --port 5190 --strictPort
```

Env production vẫn `/api` và build ra `dist/`. Fixture server cổng 5191 đã dừng;
fixture vẫn giữ để test offline, không chứa trong dist hoặc làm fallback.

## Kết quả

- TypeScript, 94/94 Node tests và Vite đạt. Không skip/fail.
- Entry JS 305,65 KB (gzip 95,42 KB), CSS 78,28 KB (gzip 15,00 KB); PLP lazy
  JS 16,54 KB/CSS 26,38 KB. Giữ bố cục ảnh, dùng WebP 143 KB thay PNG 2,19 MB.
- Gallery S3 tải được, modal mở/đóng/Escape, scroll lock và focus return đạt.
- 12 URL ảnh PLP đều thuộc host S3 sản phẩm; 8 ảnh trên trang chủ cũng từ bucket
  này. Không log query ký tạm. Có 3 sản phẩm khác cùng danh mục trên PDP Journey Max.
- Chọn Kem, giá đổi 2.190.000 → 2.290.000đ, số lượng 2 giữ trong URL. Đây chỉ là lựa chọn
  UI; không gửi giỏ/đơn/payment mutation.
- PDP/PLP/auth đo 375/768/812/1200px (PDP thêm 1440px) có scrollWidth bằng clientWidth;
  các giá trị client tương ứng 360/753/797/1185/1425px do scrollbar. Native lightbox
  mở/đóng, Escape, khóa scroll và trả focus đạt. Tab đăng ký chuyển đúng form,
  aria-current cập nhật; không nhập credential.
- [Ảnh trang chủ desktop](previews/editorial-desktop.png),
  [mobile](previews/editorial-mobile.png) và
  [chi tiết desktop 1200px](previews/commerce-detail-desktop.png) được chụp từ UI
  local với API đã deploy. Chỉ cắt toolbar QA, không dựng ảnh giả thay ứng dụng.

Phát hành sau selective review qua PR/checks/main CD theo [runbook](ui-cicd.md),
không upload thủ công bundle đè pipeline. Phần kiểm thử UI local và lưu ảnh
không thay thế nghiệm thu luồng thanh toán production.

## Nghiệm thu phát hành — 27/10/2026

Chủ dự án yêu cầu tiếp tục bước push. Đã commit 33 file ứng dụng/tài liệu/ảnh,
giữ nguyên skill local đang staged. Nhánh `codex/retail-storefront-refresh`
được push tại `f238edd5db35e8351ec1116ff67dbdbb1fdd5baa` và mở
[PR #8](https://github.com/triramisu/shop-ui/pull/8). Hai job `verify` và
`dependency-review` trên [CI PR](https://github.com/triramisu/shop-ui/actions/runs/40441523657)
đạt trước khi squash merge; không bypass hoặc thay branch protection.

Merge commit `d3a98d8f2c30e01e36f285126dc15c7e49e25410` có
[CI/CD main](https://github.com/triramisu/shop-ui/actions/runs/40441673093)
verify/deploy thành công. Pipeline thực hiện OIDC, upload assets/index,
invalidation/wait và website/API smoke. Đọc lại public `release.json` khớp
commit này; index SHA256 khớp bản đã build local:
`815c9d32484de752be496eda6dbfbbe82087de05f7100c1451b2e90d9f863a82`.
Browser tại domain production đã hiển thị hero, danh mục và sản phẩm DEMO.

Đây là bằng chứng lần phát hành giao diện, không khẳng định marker commit sẽ
không thay sau các lần deploy tài liệu. Dùng `release.json` và workflow của
HEAD mới nhất khi vận hành; không sửa marker thủ công để khớp biên bản cũ.
