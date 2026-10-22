# UI-NAV-01 — active theo URL danh mục

## Hợp đồng tám phần — 22/10/2026

1. Sửa lỗi thanh điều hướng đánh dấu Tất cả sản phẩm khi URL đang chọn một
   category. Đồng bộ desktop/mobile; không đổi giao diện tổng thể hoặc dữ liệu.
2. UI sở hữu presentation; dùng location của React Router và parser
   readListingState hiện có làm nguồn sự thật cho category, không thêm state
   click cục bộ, API, backend, migration hoặc config AWS.
3. /products không có category hợp lệ → Tất cả sản phẩm active; có UUID hợp lệ
   → đúng category active; đường dẫn khác/chi tiết product → không đánh dấu
   mục catalog. q/sort/page/view không làm đổi danh mục đang chọn.
4. UUID case-insensitive theo parser hiện hành, category rỗng/sai định dạng
   fallback như PLP. Không gọi API riêng tư, đổi auth, ghi token hoặc mutate DB.
   Một mục active trong mỗi menu; aria-current=page chỉ trên mục active.
5. Component link dùng chung cho hai menu, regression render với router thật,
   README/runbook ghi rõ local khác bundle production.
6. Test all/category A→B, malformed/unknown category, trailing slash, route
   khác/product detail, query phụ và semantic markup. Browser kiểm click,
   reload/Back, menu mobile và theme hiện tại nếu môi trường cho phép.
7. Gate npm run build (TypeScript + full Node tests + Vite), git diff --check,
   browser local. Không suy ra production đã sửa khi mới build local.
8. Chỉ sửa bundle UI; không deploy/push/merge hoặc upload S3/invalidation trong
   task này. Rollback bằng bundle UI trước, không rollback DB hoặc hạ tầng.
   Thay đổi README/domain recovery có sẵn được giữ nguyên.

## Nguyên nhân

Navbar dùng NavLink to=/products cho Tất cả sản phẩm; active của link này khớp
pathname, không phân biệt query category. Các link danh mục là Link thường nên
không có active/aria-current. Đây không phải lỗi dữ liệu S3 hoặc Catalog API.

## Tiếp tục phát hành — yêu cầu ngày22/10/2026

Chủ repo yêu cầu hoàn tất merge UI vào main và duy trì README theo cùng quy
trình backend. Phần8 của hợp đồng ban đầu là giới hạn của lượt sửa local;
yêu cầu mới cho phép commit/push/PR/merge sau quality gates, **không** cho phép
tự upload S3/invalidation hoặc thay AWS/backend/payment.

- Giữ đúng bản sửa link/nav/CSS/test, không thiết kế lại hoặc đổi dependency.
- Bổ sung quy trình task/gate/Git/lệnh PowerShell vào README. Tài liệu DNS đã
  có được review để link README không trỏ tới file thiếu; các mốc DNS là lịch
  sử, không thực hiện lại DNS hoặc đưa credential/IP cá nhân vào Git.
- Chạy lại npm ci/build/audit, diff/secret review; chỉ stage file được liệt kê.
- PR phải có verify/dependency-review xanh trên đúng head; merge không bypass.
- Chờ workflow merge commit main đạt, đồng bộ/build lại main và ghi bằng
  chứng. Tài liệu hậu kiểm nếu có commit mới cũng đi PR/CI riêng.
- Không đánh dấu release hoàn tất từ75 test local hoặc từ PR mới được mở.
- Rollback nguồn qua revert/PR; rollback bundle là thao tác phát hành riêng,
  không reset worktree, sửa DB hoặc coi merge UI là bật VNPay.

## Kết quả local

- Thêm `src/components/CatalogNavLink.tsx`: lấy pathname/search từ useLocation,
  dùng readListingState để chuẩn hóa UUID và quyết định active/aria-current.
  Không dùng effect lưu selected tab hoặc state theo click, nên URL trực tiếp,
  đổi query, bộ lọc, Back và reload dùng cùng một nguồn sự thật.
- Navbar dùng component này tại bốn chỗ (all/category desktop/mobile), không
  trộn NavLink chỉ khớp pathname với category Link không active. Giữ NavLink
  Khám phá/giỏ/đã lưu hiện hữu. Thêm màu/weight active cho mobile; desktop dùng
  underline/màu sẵn có, không redesign hoặc thêm motion/dependency.
- `tests/catalog-navigation.test.mjs`:8 bài render component với StaticRouter
  thật, xác minh class/aria-current và href. Có unknown UUID không làm sáng
  nhầm All, UUID sai/rỗng fallback giống PLP, query phụ, trailing slash,
  product detail/route khác và hai menu đều dùng component chung.
- `npm run build` đạt: TypeScript ứng dụng/config, **75/75 test**,0 fail/skip,
  Vite production build. Không đổi package/lockfile, Java/API/schema hoặc
  backend coverage. Không lấy75 UI test làm bằng chứng branch backend >80%.
- Browser local dùng loopback riêng `127.0.0.1:5184`, proxy chỉ đọc Catalog từ
  HTTPS domain Shop hiện hành; không login, tạo sản phẩm, giỏ/đơn hoặc payment.
  Danh mục không dây hiện4 sản phẩm, chỉ link không dây được tô màu/gạch chân;
  đã click sang Studio rồi Back/reload, quay về All thấy12 sản phẩm và chỉ All
  active. Theme tối được xem bằng screenshot. Bằng chứng lưu ngoài repo:
  `shop-ui-navigation-active-20261022.png` và
  `shop-ui-navigation-all-20261022.png`. Đã đóng tab/server QA tạm sau kiểm tra,
  không dừng backend hoặc các tiến trình Node khác của người dùng.
  Mobile dùng cùng component/semantic được regression render; chưa giả định đã
  kiểm viewport mobile hoặc reduced-motion OS trong task này.
- Giữ nguyên README/domain recovery và `.agents/` có sẵn. Không stage/commit/
  push/merge/upload S3 hoặc invalidation CloudFront trong lượt sửa local.

## Kiểm tra lại và phát hành

Trong PowerShell tại D:/shop-ui:

```powershell
node --test tests/catalog-navigation.test.mjs
npm run build
git diff --check
```

Nếu backend local chưa chạy, có thể mở một dev server QA loopback riêng để
đọc dữ liệu Catalog public đã có; không thay `.env.local` hoặc env production:

```powershell
$env:VITE_DEV_API_TARGET='https://aydibro.click'
npm run dev -- --host 127.0.0.1 --port 5184 --strictPort
```

Proxy chỉ có trong tiến trình dev đó. Không dùng localhost/port5184 làm URL
API production. Kết thúc QA bằng Ctrl+C trong terminal đã mở, không kill các
Node process khác. Production build vẫn giữ API same-origin `/api`.

Đây là **bản sửa local**, chưa phải thay đổi trên aydibro.click. Sau review/
commit/PR/required checks/merge riêng, build đúng source phát hành rồi upload
**nội dung bên trong dist/** vào UI bucket private hiện hữu. Không upload repo,
node_modules, file env hoặc một thư mục dist lồng thêm; không bật public S3.
Sau upload index.html/assets, thực hiện invalidation CloudFront theo runbook
phát hành và mở URL category/reload để xác minh bundle mới. Upload/invalidation
là thao tác riêng, chưa thực hiện trong task này. Không redeploy backend/RDS.

Rollback bằng artifact UI trước nếu phát hiện regression. Không reset toàn
worktree, sửa DB/category, tắt auth hoặc thay origin CloudFront để chữa active.
