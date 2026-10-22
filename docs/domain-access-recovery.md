# Khôi phục truy cập UI qua CloudFront — DNS-01

**Cập nhật sau DNS-01 — 22/10/2026 lúc08:34:11 UTC+7:** theo yêu cầu và
approval riêng AWS-PUBLIC-01, stack đã UPDATE_COMPLETE/CloudFront Deployed,
`ViewerAccessMode=public`. Website hiện không còn giới hạn viewer IP. Những
đoạn “vẫn giới hạn IP” bên dưới là trạng thái lịch sử lúc nghiệm thu DNS-01,
không phải yêu cầu cấu hình lại. SSH/DB/S3/auth vẫn giữ giới hạn; WAF vẫn Count.
Rollback viewer qua change set `ViewerAccessMode=restricted`, không public
bucket hoặc mở AdminCidr. Hướng dẫn đầy đủ nằm trong repo backend tại
`docs/aws-public-viewer.md` (local `D:/shop/docs/aws-public-viewer.md`).

## Hợp đồng nhiệm vụ — 22/10/2026

1. **Mục tiêu và phạm vi:** khôi phục truy cập `https://aydibro.click` từ mạng
   hiện tại của chủ repo sau khi đã upload UI. Chỉ thêm DNS apex và một client
   IPv4 vào allowlist website; không mở website cho mọi IP hoặc bật payment.
2. **Sở hữu/đầu vào:** Cloudflare quản lý DNS của `aydibro.click`; CloudFormation
   `shop-aydibro-prod` tại Singapore quản lý CloudFront Function. Bucket UI có
   `index.html`, `assets/`, `fonts/`, `images/`; frontend dùng `/api` cùng origin.
3. **Bất biến:** CNAME `@` trỏ đúng distribution, DNS only/TTL Auto. Bổ sung
   `AdditionalClientIpv4` qua change set dùng template đã deploy; mọi parameter
   khác dùng giá trị trước. Giữ `AdminCidr`, SSH, EC2/ASG, RDS, S3, TLS và WAF.
4. **An toàn:** không public bucket, không mở mọi IP, không đọc application/DB
   secret, không sửa Function trực tiếp gây drift. Không ghi credential hoặc IP
   mạng cá nhân vào Git. Không tự bật thêm dịch vụ/quyền hoặc logging tính phí.
5. **Đầu ra:** DNS record, parameter update có plan/review và hướng dẫn trong
   README/runbook. Không đổi source UI/backend, env build, schema hoặc dữ liệu.
6. **Kiểm tra:** DNS phân giải; HTTPS hợp lệ; root/products/login và bundle
   JS/CSS tải được; API được phân biệt với SPA; client ngoài allowlist vẫn bị
   chặn. Chỉ smoke read-only, không tạo đơn, đăng nhập tài khoản thật hay trả tiền.
7. **Nghiệm thu:** change set không Add/Remove/replacement; chỉ Function đổi.
   AWS pre-deployment validation không lỗi chặn; stack UPDATE_COMPLETE; hậu kiểm
   DNS/HTTP và browser. Không coi UI tải được là toàn dự án đã go-live.
8. **Rollback:** khôi phục AdditionalClientIpv4 bằng change set mới đã review;
   bản ghi apex có thể sửa/xóa riêng sau xác nhận, giữ nguyên record `shop` và
   ACM validation. Không rollback DB, xóa bucket hoặc reset worktree.

## Bằng chứng trước khi sửa

- Resolver trả SOA thay vì A/AAAA cho apex; trình duyệt chưa tìm được website.
- Truy cập CloudFront có Host/SNI của domain trả HTTP 403,
  `X-Cache: FunctionGeneratedResponse from cloudfront`, `Restricted deployment`.
- CloudFront đã Deployed, alias và chứng chỉ us-east-1 đúng domain/ISSUED;
  default root object là `index.html`. File này đã ở gốc bucket, MIME text/html
  và mã hóa AES256. Chưa kết luận quyền origin chỉ từ việc file tồn tại.
- Stack chỉ có IP quản trị cũ; IP mạng hiện tại khác và client bổ sung đang rỗng.
- Cloudflare có ba record cũ: hai ACM validation và `shop` tới ALB, chưa có apex.
- Tài khoản chưa có durable CloudTrail trail; event history không thay thế lưu
  audit lâu dài. Không tự bật thêm trail trong nhiệm vụ sửa truy cập này.

## Luồng đúng và cách phân biệt lỗi

```text
Trình duyệt → Cloudflare DNS → CloudFront (HTTPS + allowlist IPv4)
                              ├── route UI → S3 private qua OAC
                              └── /api, /api/* → ALB → backend → RDS private
```

Cloudflare ở đây chỉ cung cấp DNS, không proxy HTTP. Vì vậy website vẫn dùng
CloudFront/WAF đang có; không cần chồng thêm proxy Cloudflare để sửa DNS.

| Dấu hiệu | Lớp cần kiểm tra | Không dùng để chữa lỗi |
|---|---|---|
| Không phân giải được tên miền | DNS, nameserver và cache resolver | Sửa CORS/backend |
| 403 `Restricted deployment`, `FunctionGeneratedResponse` | Client IP và CloudFront Function | Public S3 hoặc mở SSH |
| 403 từ origin S3 sau khi đã qua Function | OAC, bucket policy, key/path object | Public bucket/ACL |
| HTML/JS/CSS tải được nhưng API lỗi | Behavior `/api`, ALB, target và backend | Đổi UI về localhost |
| API trả 200 JSON, `totalElements=0` | Catalog chưa có sản phẩm public | Seed dữ liệu tự động vào prod |

## Thao tác 1 — cập nhật IP website qua CloudFormation

1. Kiểm tra đúng AWS account bằng `aws sts get-caller-identity`; profile của
   dự án là `shop-prod`, stack ở `ap-southeast-1` (Singapore).
2. Lấy IPv4 public của **máy đang mở website**, không phải IP LAN/EC2/RDS:
   `curl.exe -4 https://checkip.amazonaws.com`. Nếu đang dùng VPN hoặc đổi Wi-Fi,
   địa chỉ ra Internet có thể khác. Không ghi IP cá nhân vào tài liệu Git.
3. Đọc trạng thái stack trước. Khi thao tác bị ngắt, luôn kiểm tra parameter,
   trạng thái stack và change set trước khi chạy lại; việc ngắt công cụ không
   đồng nghĩa AWS đã hủy thao tác.
4. Tạo change set UPDATE với `UsePreviousTemplate`, giữ mọi parameter bằng
   `UsePreviousValue=true`, chỉ đổi `AdditionalClientIpv4` thành IPv4 đã xác nhận.
   Không lấy YAML local có thay đổi AMI/ASG chưa duyệt để sửa một IP website.
5. Review property diff và AWS preflight (`describe-events`): đợt này plan chỉ
   có một Modify `ViewerRequestFunction`, không Add/Remove/replacement.
6. Chỉ Execute sau khi người dùng duyệt đúng plan. Chờ `UPDATE_COMPLETE`, rồi
   kiểm tra HTTPS tới CloudFront với Host/SNI của domain **trước khi đổi DNS**.
7. Không sửa Function trực tiếp trên console gây drift. `AdminCidr` dành cho
   quyền quản trị/SSH vẫn giữ nguyên; nó không phải parameter cần sửa khi chỉ
   muốn bổ sung một máy xem website.

Đợt DNS-01 dùng change set `ui-client-ip-20261022T011226Z`, đã được duyệt.
Template không thay đổi; không chạy lại lint/Guard cho đợt parameter-only này
theo phạm vi đã được chấp nhận. Điều này **không** có nghĩa Guard đã sạch:
34 finding cũ và thiếu durable CloudTrail vẫn chưa xử lý trong nhiệm vụ này.

## Thao tác 2 — thêm DNS trong Cloudflare

1. Mở đúng tài khoản đang quản lý `aydibro.click` → **DNS → Records**.
2. Chọn **Add record**, nhập:

   | Trường | Giá trị của Shop hiện tại |
   |---|---|
   | Type | CNAME |
   | Name | `@` (apex `aydibro.click`) |
   | Target | `d3s7ikl62j69z1.cloudfront.net` |
   | Proxy status | **DNS only**, mây xám |
   | TTL | Auto |

3. Kiểm tra rồi **Save**; xác nhận record xuất hiện trong bảng. Với dự án khác,
   lấy target từ distribution của chính dự án đó, không sao chép hostname Shop.
4. Giữ hai CNAME ACM validation và CNAME `shop` → ALB. Không đổi nameserver,
   không trỏ apex vào ALB/IP EC2 và không thêm `www` khi chưa có alias/certificate
   tương ứng. CNAME apex được Cloudflare flatten, nên truy vấn A có thể trả IP
   CloudFront chứ không hiện chuỗi CNAME — đây không phải lỗi.
5. DNS only giữ lưu lượng HTTP đi thẳng tới CloudFront. Nếu bật proxy Cloudflare,
   viewer IP CloudFront nhìn thấy thay đổi; allowlist hiện tại không được thiết kế
   để tin một header X-Forwarded-For tùy ý. Không bật proxy để chữa lỗi IP.

Tham khảo chính thức:
[Cloudflare CNAME flattening](https://developers.cloudflare.com/dns/cname-flattening/)
và [DNS only/proxied](https://developers.cloudflare.com/dns/proxy-status/).

## Thao tác 3 — hậu kiểm, không chỉ kiểm tra file S3

PowerShell trên máy Windows (không copy dấu backtick sang Bash):

```powershell
aws sts get-caller-identity --profile shop-prod --region ap-southeast-1
aws cloudformation describe-stacks --profile shop-prod --region ap-southeast-1 --stack-name shop-aydibro-prod --query 'Stacks[0].StackStatus' --output text --no-cli-pager
Resolve-DnsName aydibro.click -Type A -Server 1.1.1.1
Resolve-DnsName aydibro.click -Type A -Server 8.8.8.8
curl.exe -sS -I https://aydibro.click/
curl.exe -sS -I https://aydibro.click/products
curl.exe -sS -i 'https://aydibro.click/api/catalog/products?page=0&size=1'
```

Trước khi Save DNS, có thể kiểm tra riêng CloudFront nhưng vẫn giữ kiểm chứng
chứng chỉ, Host và SNI đúng domain:

```powershell
curl.exe -sS -i --connect-to aydibro.click:443:d3s7ikl62j69z1.cloudfront.net:443 https://aydibro.click/
```

Đây chỉ là phép chẩn đoán, không chứng minh DNS đã chạy. Nghiệm thu cuối phải
dùng URL bình thường, không `--connect-to`, `--resolve`, file hosts hoặc `-k`.
Nếu resolver còn cache kết quả không có record, kiểm tra nameserver authoritative
và resolver công khai trước; không hứa DNS mọi mạng đổi ngay lập tức.

Mở website, vào trực tiếp `/products` rồi reload; kiểm tra `/login`, hình/font,
JS/CSS và Network API cùng origin. Chỉ GET catalog public; không dùng tài khoản
thật, tạo order, thanh toán hay tự thêm sản phẩm vào prod để smoke test.

## Kết quả đã kiểm tra — 22/10/2026

- CloudFormation đạt `UPDATE_COMPLETE` lúc **08:15:31 giờ Việt Nam**; parameter
  bổ sung IPv4 đã có hiệu lực. Không Execute lại khi tiếp tục sau lần ngắt.
- AWS operation `058e4df5-8ca3-4c98-bd50-ae0ba40a153a` không có
  `VALIDATION_ERROR`. Plan trước Execute chỉ sửa Function. Hậu kiểm có thêm
  event `Database UPDATE_COMPLETE`: physical ID và toàn bộ ResourceProperties
  giống event trước, RDS đang `available`, không pending modification; tra cứu
  CloudTrail `ModifyDBInstance` trong cửa sổ thao tác không có kết quả. Không
  gửi lệnh chỉnh DB, đọc secret hay coi event đó là bằng chứng đổi cấu hình DB.
- Cloudflare lưu **4 record**: thêm apex tới CloudFront, giữ ba record cũ.
  Authoritative DNS, resolver `1.1.1.1` và `8.8.8.8` đều phân giải được A.
- Sau Save, URL thật `/`, `/products`, `/login` trả **200 text/html**; JS và CSS
  trả **200** với MIME đúng; kiểm chứng TLS thành công, không tắt kiểm chứng.
- `/api/catalog/products?page=0&size=1` trả **200 application/json**, code 1000,
  `totalElements=0`. Backend đã trả catalog rỗng; không phải API bị rewrite
  thành HTML. Không tự seed dữ liệu prod.
- CloudFront `Deployed`, alias đúng apex, TLS tối thiểu 1.2, WAF vẫn gắn;
  `/api` và `/api/*` vẫn đi `shop-api`, S3 vẫn qua OAC. Truy cập ẩn danh trực
  tiếp `index.html` ở S3 REST endpoint bị **403** như mong đợi.
- Tải code Function ở stage **LIVE** để kiểm hợp đồng local: **8/8** ca đạt
  (hai IPv4 được phép, giữ API/asset path, rewrite SPA, từ chối IPv4/IPv6 khác).
  Đây là mô phỏng bằng code LIVE, **không phải** đã thử request từ một mạng khác.
- Browser mở domain thật, điều hướng và reload trang sản phẩm được. Không có
  thay đổi source, build, env, migration, backend image hoặc dữ liệu trong task.

## Giới hạn và việc còn lại

- Website **vẫn giới hạn IPv4**, không phải mở public. Đổi mạng/VPN có thể gặp
  403 `Restricted deployment` trở lại; cập nhật qua parameter/change set review.
- Chưa bổ sung `www`, chưa nghiệm thu đăng nhập/checkout/VNPay IPN/SIT, chưa
  go-live hay chứng nhận bảo mật toàn bộ dự án. Catalog hiện chưa có sản phẩm.
- Guard cũ và durable CloudTrail cần nhiệm vụ riêng; không tự bật dịch vụ tính
  phí hoặc đổi WAF Count thành Block trong đợt sửa truy cập này.
- Lúc kết thúc DNS-01, tài liệu mới nằm trên nhánh local. Sau đó đã được
  review/xuất bản cùng [PR UI #3](https://github.com/triramisu/shop-ui/pull/3)
  ngày22/10/2026 để README không thiếu hướng dẫn; không chạy lại DNS hoặc
  upload bundle khi xuất bản tài liệu. Các trạng thái catalog rỗng/allowlist
  ở biên bản DNS-01 là lịch sử; đối chiếu cập nhật đầu file và README hiện hành.
