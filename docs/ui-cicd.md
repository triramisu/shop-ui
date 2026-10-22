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
   review trust/env branch restrictions cùng nhau. Repo này dùng immutable
   subject (đã đối chiếu CloudTrail):
   `repo:triramisu@200755440/shop-ui@1421523514:ref:refs/heads/main`.
   GitHub áp dụng định dạng có owner/repository ID cho repo mới sau 15/07/2026
   hoặc đã opt-in; không sao chép name-only subject cho mọi dự án. Kiểm repo ID,
   owner ID và subject thực tế; giữ StringEquals, không sửa thành wildcard khi
   gặp AccessDenied. Giữ bảo vệ main và PR checks;
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

Đã thực hiện ngày 22/10/2026 (UTC+7); các bước dưới ghi lịch sử preflight.
Kết quả deploy thật nằm ở phần nghiệm thu sau chẩn đoán:

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

Không dùng bằng chứng preflight bên trên để thay kết quả phát hành thật bên dưới.

### Chẩn đoán lần deploy đầu — chưa upload

[PR #5](https://github.com/triramisu/shop-ui/pull/5) head `ccc90c7`, PR run
[39789243526](https://github.com/triramisu/shop-ui/actions/runs/39789243526)
verify/dependency-review đạt, 89/89 test/audit0; không có review thread mở.
Merge **20:44:48** thành `81a01ca04e0e462852fcc043ebc515e40c92d7ce`.
[Main run 39789582445](https://github.com/triramisu/shop-ui/actions/runs/39789582445)
verify/build/artifact đạt, nhưng AssumeRoleWithWebIdentity AccessDenied; bước
upload/invalidation/smoke **skipped**, không được coi deploy thành công.

CloudTrail Singapore lúc **20:45:22–23** ghi principal có subject immutable
`repo:triramisu@200755440/shop-ui@1421523514:ref:refs/heads/main`, khác trust
name-only đã tạo. Không phải thiếu S3/CloudFront permission hay cần access key.
Chỉ đọc eventTime/error/principal/provider, không dump token/request credential.
Sửa duy nhất giá trị StringEquals sub trong trust và test regression; bốn
permission và provider/audience/nhánh vẫn giữ nguyên. Đây là sửa identity đúng
repo đã được duyệt, không mở quyền repo khác. Validate/readback trust trước
rerun; không sửa subject setting của GitHub để che lỗi. Với dự án khác phải
đọc định dạng subject hiện hành từ tài liệu/CloudTrail trước khi tạo role.

Đã chạy `aws iam update-assume-role-policy --role-name shop-ui-github-deploy
--policy-document file://deploy/aws/github-trust.json --profile shop-prod
--region ap-southeast-1` sau validate, rồi get-role đọc lại khớp toàn bộ trust
JSON mới. Không managed policy, permission file không đổi; local regression
89/89/build/audit0/diff-check đạt lại. Sửa chữa được đưa qua PR #6, không rerun
commit cũ hoặc khẳng định deploy trước khi có main run mới đạt.

### Nghiệm thu phát hành thật — 20:52 ngày 22/10/2026

- [PR #6](https://github.com/triramisu/shop-ui/pull/6), head
  `7d68cc5d14d25f55a990954d4f07ce8cefaaf789`, hai checks
  [run39790389922](https://github.com/triramisu/shop-ui/actions/runs/39790389922)
  đạt, deploy skipped đúng chính sách PR; không có review/thread chưa xử lý.
  Merge lúc **20:51:18**, commit `1e5e9a9dd9c5281ba60bc27eb9b4516795b31633`.
- [Main run39790572474](https://github.com/triramisu/shop-ui/actions/runs/39790572474)
  **Success**, verify20 giây/deploy49 giây; verify89/89 test, audit0. Artifact
  gắn đúng commit/run, digest
  `c54f5d779c7f637e961e02061eb259d492ee4960d52f73b52080647dd3a254d4`.
  dependency-review skipped ở push sau khi đã đạt trên PR.
- OIDC/AssumeRole thật đạt, không static key. Upload chỉ UI bucket bằng
  bốn quyền đã duyệt; không dùng quyền admin laptop để upload thay cho pipeline.
- Invalidation **I59D20UTMN1DC2O6D00H33UIYN**, tạo **20:52:06**, đường dẫn `/*`,
  CallerReference `shop-ui-1e5e9a9dd9c5281ba60bc27eb9b4516795b31633-39790572474-1`.
  Wait và get-invalidation độc lập đều xác nhận **Completed**.
- Job summary lúc **20:52:31**: deployed=true, đúng commit; viewer=true,
  index-referenced assets=2, catalog=true, anonymousDenied=true. Independent
  HTTPS GET: release.json200 đúng commit, /products200 hash khớp marker;
  public catalog200/code1000/totalElements12, my-info401/code1006, không gửi token.
- Browser domain thật: category “DEMO — Tai nghe không dây” có4 sản phẩm và
  duy nhất link này có active/aria-current=page; All chỉ active All, Back và
  reload deep link giữ đúng danh mục. Không login/tạo đơn/đổi account để smoke.
- S3 readback: bốn PublicAccessBlock=true, AES256, versioning Enabled. Không
  sửa bucket policy, product image bucket, app stack, DB, DNS, SSH/ASG hay payment.
- Main local fast-forward bằng git pull --ff-only, HEAD=origin/main ở commit
  phát hành trên. Tài liệu hậu kiểm cũng qua PR/CI; commit tài liệu trên main
  vẫn kích hoạt CD và release.json sẽ đổi SHA dù bundle UI không đổi. Luôn lấy
  SHA/run mới nhất từ Actions/release marker, không coi SHA lịch sử là bản mới nhất.

### Quy trình sử dụng từ lần sau

1. Ở D:/shop-ui, đọc README/status, tạo nhánh task từ main đã đồng bộ. Sửa UI
   rồi chạy npm ci, npm run build, npm audit --audit-level=moderate và diff-check.
2. Commit tiếng Việt, push nhánh, mở PR main; chờ verify/dependency-review
   trên head SHA mới nhất. Không bỏ qua PR hoặc push source thẳng lên S3.
3. Merge sau gate/review; mở Actions → CI của merge commit. verify phải xanh
   trước deploy; deploy phải xanh và summary deployed=true, không chỉ skipped.
4. Trình duyệt mở https://aydibro.click; nếu tab giữ bundle cũ thì reload.
   Kiểm release.json commit trùng main run vừa deploy, không dùng localhost.
5. Không cần giữ laptop/Termius mở cho UI CD. GitHub runner lấy phiên OIDC tạm,
   upload dist và invalidation; backend không tự được build/deploy theo UI.
6. Khi fail, dùng mục chẩn đoán/rollback, không mở thêm quyền theo phỏng đoán.
   Tắt cờ UI_DEPLOY_ENABLED=false nếu muốn dừng phát hành tiếp; bật lại true
   rồi workflow_dispatch main để build mới khi đã xử lý nguyên nhân.

Nghiệm thu này chỉ UI-CD-01. WAF vẫn Count, 34 finding Guard và durable
CloudTrail chưa giải quyết; anonymous401 không thay kiểm quyền USER/ownership.
Nhiệm vụ kế tiếp nên là nghiệm thu USER/auth/ownership xuyên UI/API, tách task
riêng và không tạo account mật khẩu chung trên website public.

Nguồn chính thức: [GitHub OIDC với AWS](https://docs.github.com/en/actions/how-tos/secure-your-work/security-harden-deployments/oidc-in-aws),
[S3 sync](https://docs.aws.amazon.com/cli/latest/reference/s3/sync.html),
[CloudFront invalidation/wait](https://docs.aws.amazon.com/cli/latest/reference/cloudfront/wait/invalidation-completed.html),
[S3 security](https://docs.aws.amazon.com/AmazonS3/latest/userguide/security-best-practices.html).
