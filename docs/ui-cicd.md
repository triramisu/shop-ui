# UI-CD-01 — GitHub Actions → S3 private → CloudFront

## Hợp đồng tám phần — 22/10/2026

1. Chủ repo yêu cầu tự động hóa npm ci/build, S3 sync và invalidation; yêu cầu
   mới cho phép CI/CD **UI**, thay quyết định hoãn pipeline trước đây trong phạm
   vi này. Không mở rộng sang backend, Docker Hub, EC2/ASG, RDS hoặc payment.
2. UI Vite xuất `dist/`, không phải `build/`. Production dùng API `/api` cùng
   origin. Đích chính xác trong `deploy/production.json`, lấy từ Outputs live:
   bucket UI `shop-aydibro-prod-uibucket-muvncutg3vyi`, distribution
   `E1VK6HT0PA7A35`, Singapore/account233377400170, website aydibro.click.
3. PR chỉ verify/dependency-review; push main hoặc dispatch **trên main** mới
   có thể deploy sau verify. Build một lần, lưu artifact gắn SHA/run, deploy
   đúng artifact ấy. Latest-main guard chặn rerun cũ ghi đè bản mới.
4. Chủ tài khoản đã duyệt OIDC/provider/role và bật UI deploy trong chat, đúng
   bốn quyền trong `deploy/aws/ui-publish-policy.json`. Trust chỉ repo UI/main,
   audience sts.amazonaws.com; không wildcard repo/ref. Không static access key,
   secret/PII hoặc AWS credential trong artifact, Git, README, log/step summary.
5. Đầu ra: workflow CI có deploy job tách riêng, script chuẩn bị/kiểm/phát hành,
   unit tests, public targets, IAM trust/permission JSON và runbook này.
6. Ca kiểm: PR/fork/branch khác bị từ chối; role/SHA sai, artifact thiếu/chunk
   thiếu/hash sai/env/map/symlink/file quá lớn bị chặn; stale run không gọi AWS;
   upload lỗi không publish index/invalidate, wait lỗi không báo smoke đạt;
   viewer cũ/HTML API fallback/private API200 không được coi thành công.
7. Gate: npm ci/build/full tests/audit, YAML/action validation, diff/secret
   review, IAM Access Analyzer/simulator, PR hai checks xanh. Sau merge phải
   verify **và deploy** main đạt: OIDC thật, S3 upload, invalidation Completed,
   release SHA/index hash đúng, assets200, public Catalog JSON200/private401.
   Unit test hoặc IAM role tồn tại không thay bằng chứng deploy thật.
8. Không dùng --delete hoặc PutObjectAcl, không public bucket. Assets lên trước,
   index cuối, chờ invalidation và smoke. Có thể có deployment một phần nếu lỗi;
   không tự giả rollback hoặc xóa dữ liệu. Khôi phục nguồn bằng revert/PR rồi
   pipeline redeploy; tắt cờ deploy để chặn lần sau, không hủy upload giữa chừng.

## Luồng thực tế

```text
PR → verify (npm ci → build/tests → audit) + dependency-review → merge
main → verify → artifact SHA/run → deploy preflight → GitHub OIDC/STS
     → sync hashed assets → sync public files → release.json → index.html
     → create invalidation /* → wait Completed → HTTPS smoke → success
```

- Không `npm ci` hoặc chạy dependency lifecycle trong job có AWS credential.
  OIDC `id-token: write` chỉ ở deploy job, không cấp trên toàn workflow/PR.
- Action pin commit SHA, không tag nổi. configure-aws-credentials v6 có tag
  annotated: phải dùng commit dereferenced `e125382…`, không dùng SHA tag object
  `4a1596…` (raw action ở tag object trả404). upload v7/download v8 dùng node24
  action runtime, build ứng dụng vẫn Node22; không đổi dependency runtime.
- Artifact retention7 ngày, tên SHA+run ID. Rerun failed deploy đọc artifact đã
  qua verify của cùng run; không dùng tên theo run_attempt vì artifact ấy chưa
  được tạo khi chỉ rerun deploy. Full rerun overwrite artifact cùng run sau khi
  verify đạt lại; không lấy artifact của PR/run khác. Hết retention thì full rerun.
- Không cancel main run đang upload. Main runs tuần tự; latest-main check chặn
  rerun đã cũ. GitHub concurrency có thể thay một pending run bằng main mới hơn,
  không bảo đảm deploy mọi commit trung gian; mục tiêu là main mới nhất đã verify.
- File≤5MiB, toàn bundle≤30MiB, tối đa200 file; kiểm env/map/symlink/missing chunks.
  Giới hạn file giữ upload dưới multipart threshold mặc định, đúng quyền PutObject
  đã được duyệt; nếu app lớn hơn phải review uploader/IAM/test riêng, không tự
  cấp multipart/ACL/retention/tagging. Node dùng AWS CLI, không có runtime AWS SDK
  để phân tích bằng IAM Policy Autopilot. SAR xác minh action/ARN; chỉ giữ **bốn
  IAM action người dùng đã duyệt trực tiếp**, không mở rộng sang các API variant.
- Hashed assets cache1 năm/immutable; file public còn lại cache300 giây. index
  luôn cp với no-cache, marker release no-store. Sync không cập nhật metadata của
  object không đổi, nên không khẳng định đã sửa Cache-Control mọi object cũ.
- Không xóa chunk cũ để tab/index cache trước không bị404. Bucket versioning
  Enabled, AES256 và bốn PublicAccessBlock đã kiểm live trước triển khai; pipeline
  chỉ ghi SSE-S3, không ACL/policy/website configuration. S3 vẫn private qua OAC.
- S3 uploads/request, storage phiên bản/chunk cũ, CloudFront invalidation và
  GitHub artifact có chi phí/quota theo usage. Không tự bật lifecycle xóa old
  releases. Review retention/dọn file riêng, không đưa quyền DeleteObject vào CD.

## Thiết lập một lần — PowerShell trên máy quản trị

Không chạy lại khi tài nguyên đã tồn tại; đọc trust/permissions/tags và review
trước. Đây là IAM bootstrap tách khỏi CloudFormation prod, không sửa stack app.
Provider/role là tài nguyên mới cho pipeline, không tái dùng role EC2/admin.

1. `aws sts get-caller-identity --profile shop-prod --region ap-southeast-1`;
   account phải khớp production.json. Kiểm provider/role chưa có; không ghi token.
2. Validate trust và permission trước attach. Access Analyzer identity không
   finding; trust có thể có suggestion CONFIRM_AUDIENCE_CLAIM_TYPE: aud là scalar,
   dùng StringEquals không qualifier, không suppress hoặc đổi thành wildcard.

```powershell
aws accessanalyzer validate-policy --policy-document file://deploy/aws/ui-publish-policy.json --policy-type IDENTITY_POLICY --profile shop-prod --region ap-southeast-1
aws accessanalyzer validate-policy --policy-document file://deploy/aws/github-trust.json --policy-type RESOURCE_POLICY --validate-policy-resource-type AWS::IAM::AssumeRolePolicyDocument --profile shop-prod --region ap-southeast-1
```

3. Sau approval cụ thể (đã có cho UI-CD-01), tạo đúng provider/role, không dùng
   AdministratorAccess/S3FullAccess hoặc access key. IAM dùng CA trust mặc định
   của AWS, không ghim thumbprint lấy từ trang không tin cậy.

```powershell
aws iam create-open-id-connect-provider --url https://token.actions.githubusercontent.com --client-id-list sts.amazonaws.com --tags Key=Project,Value=shop-ui Key=ManagedBy,Value=ShopUiGitHubActions --profile shop-prod --region ap-southeast-1
aws iam create-role --role-name shop-ui-github-deploy --assume-role-policy-document file://deploy/aws/github-trust.json --max-session-duration 3600 --tags Key=Project,Value=shop-ui Key=ManagedBy,Value=ShopUiGitHubActions --profile shop-prod --region ap-southeast-1
aws iam put-role-policy --role-name shop-ui-github-deploy --policy-name ShopUiPublish --policy-document file://deploy/aws/ui-publish-policy.json --profile shop-prod --region ap-southeast-1
```

Policy có ba statement: list duy nhất UI bucket; upload duy nhất object của UI
bucket; create/get invalidation duy nhất distribution UI. Không GetSecretValue,
IAM admin/PassRole, RDS/EC2, product image bucket, DeleteObject hoặc quyền ACL.
STS GetCallerIdentity không cần thêm allow riêng; configure action kiểm expected
account. Session1800 giây; job timeout20 phút và request retry hữu hạn.

4. GitHub `triramisu/shop-ui` → Settings → Secrets and variables → Actions →
   **Variables** (không phải Secrets), tạo:

   | Name | Value |
   | --- | --- |
   | AWS_DEPLOY_ROLE_ARN | arn:aws:iam::233377400170:role/shop-ui-github-deploy |
   | UI_DEPLOY_ENABLED | true |

   ARN là metadata, không phải credential. Không tạo AWS_ACCESS_KEY_ID/
   AWS_SECRET_ACCESS_KEY. Trust subject đang dùng main ref; không tự thêm
   GitHub Environment vì nó đổi OIDC sub. Nếu cần environment approvals, phải
   review trust/env branch restrictions cùng nhau. Giữ bảo vệ main và PR checks;
   ai có thể thay workflow trên main có thể sử dụng quyền upload UI này.
5. Merge PR workflow sau verify/dependency-review xanh; push main sẽ verify rồi
   deploy. Trước khi merge, cờ true không thể deploy code feature vì workflow/
   trust chỉ main. Không trực tiếp chạy script publish từ laptop bằng profile admin.

## Theo dõi và kiểm lại

GitHub Actions → CI → đúng SHA main → verify/deploy đều success. Deploy step
summary có commit/invalidation/check flags; không có credential hoặc API body.
`dependency-review` chỉ PR; skipped ở push không phải bỏ qua gate PR.

```powershell
curl.exe -fsS https://aydibro.click/release.json
curl.exe -sSI https://aydibro.click/products
curl.exe -sSI 'https://aydibro.click/api/catalog/products?page=0&size=1'
aws cloudfront get-invalidation --distribution-id E1VK6HT0PA7A35 --id INVALIDATION_ID --profile shop-prod --region ap-southeast-1 --query 'Invalidation.Status'
```

Marker public chỉ chứa commit và index SHA256, không user/password/provider key.
Mở category/All/Back/reload để kiểm active menu sau khi release đúng SHA. API
private401 chỉ chứng minh anonymous bị chặn, không thay test USER403/ownership.
Pipeline không login, tạo user/order hoặc thanh toán thật. WAF Count/34 Guard/
durable CloudTrail gap của hạ tầng vẫn là việc riêng, không gọi CD pass là go-live.

Khuyến nghị bật audit CloudTrail control-plane/data events cho S3, access logs và
CloudWatch metrics/alerts với destination mã hóa, retention/quyền truy cập hẹp.
Chưa tự bật dịch vụ log/chi phí/quyền mới trong task; event history không thay
durable audit. OIDC trust của role mới không giải quyết các finding cũ.

## Lỗi, khóa deploy và rollback

- Không có role variable/cờ false: deploy skipped hoặc preflight fail rõ, không
  fallback access key. AccessDenied: kiểm role/policy/bucket deny, không mở public.
- Stale main: ghi SUPERSEDED_MAIN, không upload. Rerun trên main mới hoặc full
  workflow_dispatch main; không ép guard qua hoặc deploy arbitrary branch.
- Upload/marker/index lỗi: job fail, invalidation chưa chắc đã chạy; assets cũ
  và version S3 còn. Wait/smoke lỗi **sau upload** có thể là bản mới đã public;
  không báo rollback/thành công. Kiểm log redact/status rồi retry run hiện hành
  hoặc revert/PR. Chỉ retry khi biết commit vẫn là latest main.
- Tắt `UI_DEPLOY_ENABLED=false` ngăn run sau; không cancel job đã upload dở.
  Không tự động rollback main bằng artifact cũ không qua review/checks.
- Revert UI bằng PR → verify/dependency-review → merge → pipeline redeploy và
  invalidation mới. Source backend/DB/ảnh sản phẩm không rollback cùng UI.

## Bằng chứng và trạng thái

Đã thực hiện ngày 22/10/2026 (UTC+7), chưa kết luận OIDC/deploy live đạt:

- Baseline main `023fb6e`; branch `codex/shop-ui-s3-cicd`, không trộn backend.
- Local: npm ci, npm run build (**89/89 test**, TypeScript, Vite), npm audit
  --audit-level=moderate (**0 vulnerability**), git diff --check đều đạt.
- actionlint **1.7.12** từ release chính thức rhysd/actionlint; checksum archive
  `6e7241b51e6817ea6a047693d8e6fed13b31819c9a0dd6c5a726e1592d22f6e9`
  khớp release digest. Chạy trên ci.yml đạt, không cài global/đổi PATH.
- Access Analyzer identity policy findings=[]; trust chỉ 1 suggestion
  CONFIRM_AUDIENCE_CLAIM_TYPE, scalar aud/StringEquals đã kiểm đúng.
- Simulator: **4 cặp action/resource được phép, 20 cặp ngoài phạm vi bị từ
  chối**. Lần đầu truyền --policy-input-list file:// bị InvalidInput do tham số
  list-string; sửa request bằng --cli-input-json với PolicyInputList chứa
  chuỗi JSON policy, không đổi policy hoặc thêm quyền để vượt lỗi.
- Provider GitHub OIDC và role shop-ui-github-deploy đã tạo; role lúc
  **16:30:17**, max session3600/session job1800. Đọc lại live khớp trust/JSON,
  không managed policy, duy nhất inline ShopUiPublish với bốn quyền được duyệt.
  STS kiểm đúng account233377400170; không đọc secret hoặc sửa app stack.
- GitHub Variables đã đọc lại trên trang Settings: AWS_DEPLOY_ROLE_ARN đúng
  role nói trên (**20:40**), UI_DEPLOY_ENABLED=true (**20:41**). Không tạo AWS
  access key/repository secret. Chưa merge nên chưa có deploy job live mới.

Hậu kiểm PR/SHA/CI và lần phát hành thật được ghi khi có kết quả.

Nguồn chính thức: [GitHub OIDC với AWS](https://docs.github.com/en/actions/how-tos/secure-your-work/security-harden-deployments/oidc-in-aws),
[S3 sync](https://docs.aws.amazon.com/cli/latest/reference/s3/sync.html),
[CloudFront invalidation/wait](https://docs.aws.amazon.com/cli/latest/reference/cloudfront/wait/invalidation-completed.html),
[S3 security](https://docs.aws.amazon.com/AmazonS3/latest/userguide/security-best-practices.html).
