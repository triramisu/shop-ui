# UI-REL-01 — main có thể build để upload S3

## Hợp đồng tám phần — 21/10/2026

1. **Mục tiêu/actor/phạm vi:** theo yêu cầu chủ repo, đưa PLP editorial và
   phần WEB-PAY-01 local đã có vào main sau review/gates; clone main có thể
   npm ci/npm run build cho S3. Không deploy AWS, đổi DNS, bật payment/CD,
   sửa backend/DB hoặc thiết kế lại UI.
2. **Đầu vào/sở hữu:** repo triramisu/shop-ui, nhánh hiện tại
   codex/shop-ui-product-listing; origin/main1a03080, PLP5d7af78 và các file
   payment chưa commit được bảo toàn/review. .agents của người dùng không
   thuộc release. Không reset, force-push hoặc chuyển nhánh khi còn dirty.
3. **Luồng/bất biến:** development proxy localhost là chủ ý; production API
   cùng origin /api qua CloudFront. Hai env public theo mode, không credential.
   Build từ chối API production localhost/absolute URL hoặc mode ngoài production;
   dev vẫn dùng được. Payment allowlist không bật provider phía backend.
4. **An toàn/vận hành:** không nhúng secret vào VITE_*, không ghi URL payment
   có token vào log/storage; giữ owner checks/session/poll budget. Production
   không có dev proxy. Router6.30.6 còn hai moderate runtime advisory: nâng
   bản vá7.18.4 tương thích React18/Node>=20, kiểm regression routing trước merge;
   không hạ audit threshold/suppress findings để làm xanh gate. Full audit còn
   Vite/esbuild dev findings; nâng Vite6.4.4 (plugin React4.3.4 hỗ trợ Vite6),
   kiểm lại env/proxy/build thay vì chỉ audit production dependencies.
5. **Đầu ra:** env/config guard/tests, README hướng dẫn build/upload/rollback,
   các thay đổi payment đã review, lockfile reproducible và CI **chỉ kiểm tra**
   verify/dependency-review trên PR/main (không OIDC/AWS credential/CD).
6. **Kiểm tra:** env precedence, thiếu/nhầm API, dev proxy không vào config
   production, allowlist HTTPS, URL/session/routing/payment regression, build
   bundle /api, fixture browser smoke không dùng DB/provider/merchant thật.
7. **Gate:** npm ci, lint/test/build, runtime audit zero moderate trở lên,
   diff/secret/artifact review; PR verify/dependency-review xanh trước merge,
   hậu kiểm workflow merge commit và main local=origin/main. Dev-toolchain
   findings nếu có được công khai; không gọi build pass là go-live sign-off.
8. **Phát hành/rollback:** commit/push feature, PR vào main, không bypass
   protection hoặc merge khi checks pending/failed. Giữ nguồn release trong
   Git, không commit dist/node_modules/env.local. Người dùng tự upload nội
   dung dist; S3 vẫn private, CloudFront phục vụ. Rollback dùng bundle release
   trước hoặc Git revert qua PR, không rollback/xóa dữ liệu đơn hàng.

## Trạng thái lúc bắt đầu

- Đã xác nhận GitHub đúng tài khoản triramisu, repo public/default main,
  có quyền push/maintain; không có PR mở từ nhánh PLP.
- Lần kiểm tra trước:59/59 test và build đạt; runtime audit còn2moderate.
- Chưa commit/push/merge hoặc thay cấu hình AWS trong nhiệm vụ này.
- Mọi kết quả phía trên là baseline, không coi là gate của bản sửa mới.

## Thay đổi và nghiệm thu local

- Thêm .env.development public (proxy localhost chỉ dev) và .env.production
  public (/api, allowlist HTTPSaydibro.click); chỉ whitelist đúng hai file
  public này trong gitignore, không whitelist env.local. Docker context giữ
  env production nhưng bỏ .agents/.idea; npm ci không fallback npm install.
- Build guard thật trong vite.config: chỉ release modeproduction, base/api,
  không dev proxy ở build/preview; payment origin HTTPS/443 không userinfo,
  path/query/fragment/wildcard/localhost/IP. Error không echo giá trị nhạy cảm.
- React Router7.18.4, Vite6.4.4, esbuild0.25.12; React18/pluginReact4.3.4 giữ
  nguyên. Version/peer support đọc từ npm registry, lockfile tạo cơ học;
  không audit fix --force. Node>=20; CI/Docker dùng22.
- Gate sau npm ci: **67/67** test, TypeScript và Vite6 production build đạt;
  runtime và full audit đều **0 finding** tại thời điểm kiểm tra. Tám test
  env mới gồm actual Vite resolveConfig và actual build phải fail khi API
  bị process-env override về localhost, không chỉ test regex/model giả.
- Browser loopbackQA: PLP empty state render, tìm kiếm giữ URLq, list/grid và
  Back khôi phục đúng; protected order chuyển login, đăng nhập dummy quay về
  đúng order/query; query giả PAID không đổi trạng thái đơn. Link VNPay an toàn
  chỉ có khi fixture trả handoff phù hợp; không mở gateway. Profile/logout
  chuyển login, header bỏ user. Không dùng DB, tài khoản thật hoặc merchant.
- Ban đầu PLP QA trống do fixture cũ trả [] cho endpoint paged products, không
  phải lỗi Router7. Sửa fixture theo StorefrontProductPageResponse (content,
  page/size/totals/first/last), reload render được; không đổi assertion để né lỗi.
- Browser smoke chỉ với API giả lập, không là nghiệm thu checkout/VNPay SIT,
  deployment S3/CloudFront, WCAG hoặc full regression backend. Chưa stress test.
- Các mục “còn2moderate” trong README là lịch sử trước nâng dependency này;
  kết quả audit0 không bảo đảm không còn lỗ hổng chưa biết hoặc sai cấu hình.

## Kiểm tra PR trên Ubuntu / Node 22

- PR phát hành: [#1](https://github.com/triramisu/shop-ui/pull/1).
- Lần CI đầu phát hiện script `node --test tests` coi `tests` là một module
  trên Node 22. Đổi sang `node --test` để dùng discovery mặc định của Node
  cho các file `*.test.mjs`, không đổi assertion hoặc giảm số test.
- Job dependency-review ban đầu báo repo chưa bật Dependency graph. Đây là
  cấu hình GitHub cần bật riêng, không sửa thành skip hoặc hạ severity để
  che lỗi. Chỉ merge khi cả hai job thực sự đạt trên head mới nhất.
- Sau khi chủ repo xác nhận, đã bật riêng Dependency graph cho repo UI:
  Settings → Advanced Security → Dependency graph. Không bật Dependabot
  auto-update, CodeQL, AI Scan hoặc tính năng trả phí; không cấp quyền AWS.

## Nguồn đối chiếu

- [Vite env và mode](https://vite.dev/guide/env-and-mode): build-time,
  production mode và override precedence; VITE_* là dữ liệu public.
- [Bật Dependency graph](https://docs.github.com/en/code-security/how-tos/secure-your-supply-chain/secure-your-dependencies/enable-dependency-graph):
  GitHub đọc manifest/lockfile để phục vụ dependency review.
- React Router advisories:
  [backslash redirect](https://github.com/advisories/GHSA-wrjc-x8rr-h8h6),
  [SSR hydration](https://github.com/advisories/GHSA-337j-9hxr-rhxg).
- [Vite advisory](https://github.com/advisories/GHSA-vg6x-rcgg-rjx6),
  [esbuild advisory](https://github.com/advisories/GHSA-67mh-4wv8-2f99).
- actions/checkout v7, setup-node v6 và dependency-review-action v4.8.3
  được đối chiếu exact tags bằng git ls-remote repo maintainer trước pin SHA.

## Git, phát hành và rollback

### Nghiệm thu nguồn main — 21/10/2026

- Commit PLP `5d7af78`, UI/config `b5df4b7` và sửa Node 22 `8bcbb24`
  đã vào [PR #1](https://github.com/triramisu/shop-ui/pull/1).
- [CI PR head 8bcbb24](https://github.com/triramisu/shop-ui/actions/runs/39627965821)
  có verify và dependency-review success. Ubuntu / Node 22.23.3 chạy 67 test,
  không fail/skip; build và audit toàn cây dependency đạt, review không phát
  hiện dependency moderate trở lên. Không bypass check hoặc protection.
- PR merge thành `2f103a3ffeeb90918e9a43c712d10031e379ddb7`.
  [CI push main](https://github.com/triramisu/shop-ui/actions/runs/39628199286)
  báo Status Success; log verify có 67/67 test, build đạt, audit 0 finding.
  Dependency-review chỉ chạy ở pull_request nên skipped trên push main.
- Đã fetch, switch main, merge --ff-only: HEAD = origin/main tại commit chức
  năng trên. Sau npm ci, build/test và full audit local đều đạt lại; dist được
  tạo từ main. `.agents/` của chủ repo vẫn untracked, không bị xóa/commit.
- GitHub connector có thể đọc repo nhưng tạo PR trả 403; đã dùng giao diện
  GitHub sau khi chủ repo tự đăng nhập, không lấy token từ kho credential.
- Chỉ cập nhật nguồn UI và cấu hình Dependency graph đã được duyệt. Không
  thực hiện AWS CLI, upload S3, bật payment, thay secret hoặc deploy backend.
- Các bằng chứng ở trên áp dụng commit chức năng, không tự xác nhận một
  commit tương lai đã qua CI. Commit tài liệu bàn giao tiếp tục qua PR và
  hậu kiểm main riêng trước khi đồng bộ máy build.

Chủ repo đã yêu cầu hoàn thiện main để tự build. Agent được giao commit/push
và merge qua PR có gates, không được push thẳng main/bypass protection.
Theo dõi SHA/PR/check status thật trên GitHub; không lấy hướng dẫn làm bằng
chứng đã merge. GitHub Actions chỉ test/audit/build, không có AWS credential,
OIDC, Docker push, S3 upload, DNS hay deploy job.

Sau merge, máy build phải ở main, clean tracked files, pull --ff-only rồi
npm ci/npm run build; không dùng dist cũ từ feature làm release main. Artifacts
không commit; các cấu hình public được đóng gói ở build time. Ghi nhận release
commit và giữ bundle cũ trước khi người vận hành upload/invalidate CloudFront.
Rollback bundle không rollback DB; muốn revert source đi qua PR/gates, không
reset/xóa dữ liệu. Không gọi hoàn tất Payment/M6/go-live chỉ vì main build đạt.
