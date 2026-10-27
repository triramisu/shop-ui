# UI-RETAIL-01 — Aydibro retail refresh, 23/10/2026

Biên bản lịch sử. Yêu cầu mới và thiết kế hiện hành nằm tại
[UI-EDITORIAL-02](editorial-storefront.md).

## Hợp đồng tám phần

1. Mục tiêu: làm mới trang chủ, PLP và khung điều hướng theo nhịp bán lẻ của
   Coolmate (banner lớn, danh mục rõ, ảnh nổi bật); không sao chép thương hiệu,
   mã nguồn hoặc hình ảnh của Coolmate. Giữ cửa hàng công nghệ Aydibro.
2. Dependency: React 18, CSS, Router, Query và SVG hiện hữu; Catalog API sở hữu
   sản phẩm/ảnh/giá. Không đổi API, schema, credential, payment hoặc pipeline.
3. Bất biến: URL giữ bộ lọc/sort/page/view; chọn SKU ở chi tiết trước khi thêm
   giỏ; tài khoản/checkout/ownership không đổi. Không tự thêm hàng vào giỏ.
4. UX/an toàn: mobile menu có Escape/trả focus; native filter dialog giữ draft;
   focus rõ, nút >=44px, giảm chuyển động; không có carousel tự chạy, fake sale,
   review giả, ảnh biên tập giả làm sản phẩm, secret hoặc analytics mới.
5. Đầu ra: shared retail tokens/frame, hero/collection blocks, card/PLP mới,
   regression tests và README/design record. Giữ `.agents/` người dùng cài;
   không thêm runtime dependency hoặc thay stack sang Tailwind/shadcn.
6. Nghiệm thu: trang chủ → category → PLP → chi tiết; search/sort/list/save,
   lỗi/rỗng/retry, menu/Escape, sáng/tối và 375/768/1440/landscape. Không gọi
   thanh toán hoặc ghi production data để kiểm thử giao diện.
7. Gate: npm ci; npm run build (TypeScript + Node tests + Vite), npm audit,
   git diff --check, browser QA với API thật đọc-only hoặc fixture ghi rõ.
   Build xanh không phải bằng chứng đã deploy hay đạt WCAG hoàn chỉnh.
8. Phát hành: nhánh riêng từ main 1133143; chưa push/merge vì main tự deploy
   S3/CloudFront. Rollback bằng artifact UI trước, không rollback DB hoặc reset
   worktree. WAF là cấu hình hạ tầng riêng; không bật Challenge từ task UI này.

## Quyết định từ skill

Đã đọc ui-ux-pro-max, design-system, ui-styling và dependency brand. Tra cứu
`ecommerce electronics bold retail` trả Feature-Rich Showcase / Vibrant &
Block-based / Rubik–Nunito Sans và palette xanh. Đây là gợi ý dataset, không
phải bắt buộc đổi brand. Bản này chủ ý giữ đất nung Aydibro, dùng Be Vietnam
Pro local (tiếng Việt), token primitive → semantic → component, bố cục ảnh
lớn và CTA rõ. Giữ CSS hiện hữu thay vì cài framework để đổi phần nhìn.

Ảnh biên tập cũ có provenance trong public/images/ATTRIBUTION.md; ảnh hàng hóa
luôn từ API. Tham khảo https://www.coolmate.me/ cho nhịp retail, không dùng
tài sản của họ. Override hiện tại ở design-system/shop-ui/pages/retail.md.

## Kết quả

- `npm ci`, TypeScript,92/92 Node tests,Vite production build và
  `git diff --check` đạt. `npm audit --audit-level=moderate`:0 vulnerability.
  Ba test mới kiểm tra hero/CTA/ảnh biên tập, giá SKU và tiền tệ khác nhau.
- Dùng dev proxy chỉ đọc `https://aydibro.click`:12 sản phẩm hiện hữu, từng
  danh mục không dây/studio trả4. Không seed/catalog mutation, login/checkout
  hoặc gọi VNPay. Thẻ ảnh đọc Catalog image API;4 ảnh danh mục tải thành công.
- Header chỉ active danh mục hiện tại; chip danh mục mới giữ sort/view/keyword
  và reset page qua helper hiện hữu. NAME:DESC + list giữ qua chọn studio và
  reload. Save/un-save có thông báo, đã trả saved IDs về trạng thái trước QA.
- Menu mobile mở/đóng và Escape; filter draft/Apply, từ khóa không kết quả,
  reset về12 sản phẩm; dialog landscape có cuộn và hàng Apply tiếp cận được.
  Đã xem form login mobile, không submit credential.
- Khung CSS iframe375×812,768×1024,812×375,1440×1000: client width thực tế có
  scrollbar từng ghi nhận360/753/797/1425px (có lúc375/1440px), không tràn ngang. Đây là viewport CSS
  trong iframe, không giả là thiết bị thật. Ngoài iframe cũng quan sát367px
  và1265px. Theme sáng/tối được xem trực tiếp; nút lưu PLP44×44px.
- Cặp màu đo: clay/white5.86:1, muted/white6.06:1, dark-muted/dark-bg9.02:1,
  campaign-accent/campaign-bg8.77:1; biên control/white3.67:1. Không phải chứng
  nhận WCAG, screen reader hoặc Core Web Vitals. Reduced-motion CSS/JS cũ và
  test vẫn giữ, chưa có emulation preference cấp OS/trình duyệt.
- Bản cuối ~305.66KB JS entry (gzip95.70KB), CSS entry61.05KB (gzip12.13KB),
  PLP lazy JS16.58KB (gzip5.53KB). Ảnh/font cũ giữ provenance; không tải asset
  Coolmate, không thêm dependency hoặc đổi lockfile/pipeline/env production.
- Chưa commit/push/PR/merge/CI/deploy bản này. Dữ liệu production không đổi.
- Lỗi mạng/retry đã kiểm tra trên upstream loopback không chạy: thông báo lỗi
  rõ, Thử lại hoạt động và URL giữ keyword/sort. Server lỗi5181 đã được dừng;
  preview5180 giữ để người dùng xem. Không tác động backend thật.

## Tái kiểm tra

```powershell
cd D:/shop-ui
npm ci
npm run build
npm audit --audit-level=moderate
git diff --check
$env:VITE_DEV_API_TARGET='https://aydibro.click'
npm run dev -- --host 127.0.0.1 --port 5180 --strictPort
```

Mở `/`, `/products` và `/tests/fixtures/retail-review.html` trên5180. Các thao
tác trên API thật ở lượt này chỉ GET catalog/ảnh; không dùng credential thật
để thử form. Kiểm thử lỗi mạng dùng dev server5181 riêng, upstream loopback
không chạy; không dừng hoặc sửa backend thật. Fixture kiểm responsive chỉ là
file test, không có trong `dist/` và không upload lên S3.

Khi được duyệt xuất bản: selective diff/secret review, commit riêng (không
`.agents/`/dist/env local),push feature branch,PR → verify/dependency-review →
merge main → chờ deploy/invalidation/HTTPS smoke. Không upload thủ công đè
artifact khi pipeline đang chạy. Rollback bằng release artifact trước theo
docs/ui-cicd.md, không xóa DB hoặc tắt WAF để sửa lỗi UI.
