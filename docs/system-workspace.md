# WEB-ADMIN-02 — hoàn thiện giao diện từ API backend

## Hợp đồng nhiệm vụ — 27/10/2026

1. ADMIN/STAFF hoặc vai trò tùy chỉnh có capability quản trị vào `/admin` sau đăng nhập thông thường; người dùng mua hàng
   tiếp tục về trang đã yêu cầu. Thêm quản lý người dùng/STAFF, vai trò/quyền,
   nối các API hồ sơ cá nhân và công cụ hoàn tiền hiện có. Đồng bộ nhận diện
   với storefront Aydibro. Không tạo dữ liệu/quyền hoặc giao dịch production.
2. Nguồn sự thật: SystemAdministrationController và service/DTO Identity,
   UserProfileController, RefundController. Source khcn_ui chỉ tham khảo luồng
   bảng → chi tiết → phân quyền; không chép framework, dữ liệu, credential.
   Không thay backend/schema/IAM/feature flag hoặc thêm dependency.
3. Tìm/phân trang người dùng → chi tiết → xác nhận đổi trạng thái/vai trò;
   role hệ thống và ADMIN được bảo vệ. Vai trò tùy chỉnh chỉ dùng permission
   server trả, không gán SYSTEM_ROLE_MANAGE. Không dựng CRUD user/reset mật
   khẩu/lịch sử truy cập/đơn hàng quản trị khi backend chưa có API.
4. Capability + profile ACTIVE trước query. STAFF không quản lý STAFF/ADMIN,
   không gán role vượt scope của mình; backend quyết định cuối. Cache actor,
   không PII/token trong log/artifact. Không retry mutation. Thay quyền thu hồi
   phiên; không ghi version giả vào API Identity vốn chưa có version DTO.
5. Đầu ra: Identity typed API/pages, điều hướng theo quyền, login landing,
   form hồ sơ/đổi mật khẩu, công cụ refund theo ID + idempotency key, shared
   brand tokens, fixture local và bảng API coverage, README/ảnh review.
6. Nghiệm thu anonymous/USER/STAFF đọc/STAFF vận hành/ADMIN, immutable role,
   ADMIN protection, self-lock/escalation, lỗi 403/409/429/5xx, logout/cache,
   redirect/deep-link, pagination, mobile/desktop và dark theme. Không thử đổi
   password/quyền/hoàn tiền thật qua browser; fixture và mock API để kiểm ghi.
7. Gate: TypeScript + Node regression + Vite/audit/artifact; browser QA local
   từ form đăng nhập bình thường. Không lấy test UI thay coverage backend.
8. PR → verify/dependency-review → merge → CI/CD main → marker/deep-link.
   Rollback UI qua PR/artifact, không reset dữ liệu. Ghi rõ backend còn thiếu
   CAS/version ở Identity và refund production đang tắt/provider giới hạn.

## Ma trận màn hình và API

| Nhóm API backend                                               | Màn hình/luồng                                                                  |
| -------------------------------------------------------------- | ------------------------------------------------------------------------------- |
| GET system-administration/users, users/{id}                    | `/admin/users`, `/admin/users/:id`                                              |
| PATCH users/{id}/status, PUT users/{id}/roles                  | Chi tiết người dùng, xác nhận trước ghi                                         |
| GET/POST roles, PUT/DELETE roles/{code}                        | `/admin/roles`; role hệ thống chỉ đọc                                           |
| GET permissions                                                | `/admin/permissions`, chọn quyền từ danh mục khi sửa role                       |
| PUT auth/my-info, PUT auth/my-info/password                    | `/profile`; đổi mật khẩu thu hồi phiên                                          |
| POST admin/payments/{id}/refunds, GET .../{refundId}           | `/admin/refunds`; thao tác thủ công, giữ nguyên key/payload khi chưa rõ kết quả |
| Catalog/ảnh/Inventory                                          | Đã có trong WEB-ADMIN-01, giữ contract và S3 backend                            |
| Catalog public/auth/CAPTCHA/cart/checkout/order/payment read   | Các màn hình storefront hiện hữu                                                |
| Auth introspect/refresh/logout; checkout return; webhook/IPN   | Giao thức nội bộ/tích hợp, không phải trang CRUD                                |
| Lịch sử truy cập, tạo/xóa/reset user, toàn bộ đơn cho quản trị | Backend chưa có endpoint; không tạo nút giả                                     |

UI không tự bật refund hoặc đổi provider. Refund chỉ tìm theo payment/refund ID
vì backend chưa có API danh sách. CREATED/UNKNOWN không đồng nghĩa đã hoàn;
không đổi key để retry kết quả chưa rõ. Không lưu payload tiền/password vào
localStorage. Role/status Identity hiện chưa có version ở contract, vì vậy UI
không tuyên bố chống mọi lần ghi đè cạnh tranh; tải lại trước khi sửa lâu.

Vai trò tùy chỉnh phải hiện trong my-info và có claim ROLE tương ứng, cùng
capability được backend cấp. USER thuần không vào quản trị. Hỗ trợ vai trò tùy
chỉnh là cần thiết để nhóm quyền vừa gán có màn hình sử dụng; không tự cấp STAFF
hoặc ADMIN. Backend vẫn xác minh chữ ký và quyết định mọi thao tác.

## Sử dụng: người dùng và nhân viên

1. Nhân viên tự tạo tài khoản tại /register, tự nhập mật khẩu.
2. ADMIN đăng nhập → dashboard → Người dùng → tìm tên đăng nhập/email.
3. Mở đúng hồ sơ, kiểm tra người nhận quyền. Chọn STAFF hoặc role tùy chỉnh.
   Các ô đang chọn là toàn bộ danh sách sẽ thay thế; bỏ USER nếu không muốn giữ.
4. Lưu vai trò → kiểm danh sách trong hộp xác nhận → xác nhận.
5. Người nhận đăng nhập lại. Menu/nút hiện theo capability trong phiên mới.

Khóa/mở/vô hiệu hóa: chọn trạng thái mới ở hồ sơ → Đổi trạng thái → xác nhận.
Các phiên tài khoản bị thu hồi. Không sửa ADMIN; STAFF không sửa STAFF hoặc
gán STAFF/ADMIN/quyền vượt scope. Không có API tạo/xóa/reset password user trong
quản trị; không hiển thị nút giả từ mẫu khcn_ui.

## Sử dụng: vai trò và quyền

ADMIN có SYSTEM_ROLE_MANAGE và quyền xem danh mục capability mới chỉnh được
role tùy chỉnh. Mã 3–50 ký tự, chữ hoa/số/gạch dưới, bắt đầu bằng chữ; mô tả
tối đa 255 ký tự, tối đa 100 quyền có sẵn. SYSTEM_ROLE_MANAGE không được cấp
lại cho custom role. ADMIN/STAFF/USER chỉ đọc. Xóa role đang được dùng trả
conflict. Sửa quyền thu hồi các phiên liên quan. Tải lại trước khi chỉnh sửa
lâu vì DTO Identity hiện chưa có version/CAS.

## Sử dụng: hồ sơ và hoàn tiền

Hồ sơ cá nhân: lưu email/họ tên/ngày sinh qua my-info. Đổi mật khẩu cần mật
khẩu hiện tại, mật khẩu mới 8–64 ký tự và xác nhận; thành công xóa phiên và
chuyển về login. Password chỉ ở state/request HTTPS, không log/URL/cache/
localStorage. Người dùng tự thực hiện đổi credential trên môi trường thật.

PAYMENT_REFUND mới thấy công cụ hoàn tiền. Tra cứu cần payment attempt ID và
refund ID, vì chưa có API danh sách. Trước khi tạo, kiểm số tiền/tiền tệ và
lưu idempotency key hiển thị. Bỏ amount là hoàn phần có thể hoàn theo backend.
Lần gửi đầu khóa input, giữ cố định key/payload; retry chỉ do người dùng bấm
và dùng đúng yêu cầu đó. CREATED/PENDING/UNKNOWN cần chờ/đối soát, không có nút
tạo key mới. Chỉ SUCCEEDED/FAILED cho chuẩn bị yêu cầu khác. State không lưu
qua reload/rời trang; dùng ID/key đã ghi nhận để đối soát, tránh tạo trùng.
Provider/flag không hỗ trợ trả lỗi backend. Số tiền JSON number vượt độ chính
xác an toàn yêu cầu đối chiếu backend; chuỗi decimal được giữ nguyên.

## Chạy lại kiểm tra local

```powershell
cd D:/shop-ui
# Dừng Vite trước npm ci trên Windows.
npm ci
npm run build
npm audit --audit-level=moderate
# Terminal 1: fixture loopback/in-memory, không AWS/SQL/provider.
node tests/fixtures/admin-preview.mjs
# Terminal 2:
$env:VITE_DEV_API_TARGET='http://127.0.0.1:5192'
npm run dev -- --host 127.0.0.1 --port 5194 --strictPort
```

Mở /tests/fixtures/admin-review.html trên cổng 5194. Account fixture local:
qa-admin, qa-staff, qa-system-reader, qa-user, qa-reader, qa-inventory;
password local PreviewOnly123!. Không tạo chúng trên RDS hoặc chạy fixture
trên AWS. Dừng server mất toàn bộ dữ liệu thử.

## Bằng chứng và giới hạn local

- TypeScript + 117/117 Node tests + Vite đạt, audit 0; 10 test mới cho landing,
  custom capability, escalation, cache, API/version/idempotency, native decimal
  pattern, độ chính xác tiền và fixture RBAC/revocation.
- Test HTTP fixture kiểm ADMIN protection, STAFF không nâng quyền, immutable
  system role, role đang gán không xóa được, revoke phiên và refund replay
  cùng key/cùng payload; khác payload trả conflict. Không thay test backend.
- Browser: ADMIN/STAFF đăng nhập thông thường tới /admin; khách không có
  capability quản trị từ login thông thường về /. Deep link admin được giữ,
  vẫn bị gate chặn nếu thiếu quyền. STAFF chỉ đọc không có nút ghi; Catalog
  bị 403. STAFF mở STAFF khác không có nút đổi trạng thái/vai trò.
- ADMIN fixture tìm/phân trang 31 tài khoản thành 3 trang, khóa/mở, gán
  CATALOG_VIEWER; tạo/sửa QA_CONTENT; cập nhật họ tên cá nhân thành công.
- Form refund nhận decimal, mở xác nhận và đã Hủy. Không gửi hoàn tiền qua
  browser; fake UNKNOWN/replay kiểm bằng test HTTP riêng, không provider.
- People list đo 1440/1200/768/375/812px không tràn HTML. User detail đo lại
  sau khi dữ liệu tải xong; role editor/permissions/refund/profile đo 1440/
  768/375px không tràn. Kiểm hình sáng/tối; không chứng nhận full WCAG.
- Formatter từng làm test loader không nhận import với dấu nháy khác. Đã
  sửa loader chấp nhận cả hai, giữ assertions và chạy lại full gate. HMR
  reset QA helper sau format HTML; các flow/đo liên quan đã được chạy lại.
- Admin lazy JS 69,77 KB (gzip 17,90 KB), CSS 21,23 KB (gzip 4,49 KB).
- [Desktop](previews/system-users-desktop.jpg) và [mobile](previews/system-users-mobile.jpg)
  là ảnh app thật, dữ liệu QA local; mobile chụp vùng iframe 375×900 bằng
  browser screenshot. Không phải phiên ADMIN hoặc bằng chứng ghi production.

Chỉ học luồng danh sách → hồ sơ → phân quyền từ khcn_ui; giữ font/palette/theme
storefront qua .brand-surface, không cài Ant Design hoặc chép module đơn vị/
SSO/reset password. Lịch sử truy cập và tổng đơn hàng quản trị cần backend
endpoint trước. S3 ảnh sản phẩm giữ luồng UI → backend → S3 qua Gateway
Endpoint của EC2. Không thay backend/migration/dependency/env/IAM/AWS.

## Phát hành — 27/10/2026

- Source `2b8f7adae0dd6a794a17a38a2a8ee955e023a549` được push và tạo
  [PR #12](https://github.com/triramisu/shop-ui/pull/12). [CI PR 40520885596](https://github.com/triramisu/shop-ui/actions/runs/40520885596)
  có verify/dependency-review success trước merge, không bypass bảo vệ main.
- Squash merge thành `1237e01e9cd2f6592d810e02c05499d66c9c6aab`.
  [Run main 40521075420](https://github.com/triramisu/shop-ui/actions/runs/40521075420)
  verify/deploy success, gồm artifact/OIDC/S3/invalidation/HTTPS/API smoke.
- Marker và index HTTPS đều 200; commit khớp SHA trên, hash index thực tế
  `30ecb2288b8d02815855f6bdfbc602521e11f60f63593a8e7c62e91c45642efc` khớp marker.
  Mở `/admin/users` anonymous trong browser đã chuyển sang `/login` và hiện form.
  Không nhập credential ADMIN, đổi quyền/password hoặc hoàn tiền production.
- Cập nhật bằng chứng qua PR tài liệu riêng, vẫn qua đủ hai gate. Commit tài
  liệu có thể thay marker SHA; mốc chức năng ở trên không phải HEAD cố định.
  Để kiểm lại, theo [runbook CI/CD](ui-cicd.md) và marker mới nhất.
- Luồng tái sử dụng: source/DTO backend → ma trận API/UI → branch từ main →
  code/test/QA → push/PR → hai gate xanh → merge → main CI/CD → marker/index/
  deep link → README. Không upload bundle bằng tay hoặc đưa fixture lên S3.
- Rollback UI bằng PR revert/artifact đã kiểm; giữ dữ liệu và quyền đã thay
  hợp lệ trên backend. Tắt/thu hồi quyền bằng API có thẩm quyền khi cần, không
  khôi phục JWT cũ hoặc reset RDS để rollback giao diện.

### Giữ form khi gia hạn phiên

Sau phát hành đầu, review phát hiện loading my-info trong lúc token tự refresh
có thể unmount trang và mất draft/key trong RAM. AdminGate giữ trang khi đã
có hồ sơ xác minh và scope hợp lệ; lần tải đầu hoặc lỗi/mismatch vẫn đóng.
Không đổi token storage, refresh protocol hoặc authorization backend. Test
render actual gate/hook kiểm profile đang refresh, profile thiếu và sai role.
