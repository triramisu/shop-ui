import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, mkdirSync, readFileSync, realpathSync, rmSync, symlinkSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { context, inspectArtifact, isLatestMain, publish, publishCommands, smoke, stampArtifact, targets } from '../scripts/ui-deploy.mjs';

const sha = 'a'.repeat(40);
const env = { GITHUB_REPOSITORY: targets.repository, GITHUB_REF: 'refs/heads/main',
  GITHUB_EVENT_NAME: 'push', GITHUB_SHA: sha, GITHUB_RUN_ID: '123', GITHUB_RUN_ATTEMPT: '1', AWS_DEPLOY_ROLE_ARN: targets.roleArn };
function fixture(t) {
  const prefix = join(realpathSync(tmpdir()), 'shop-ui-release-test-');
  const root = mkdtempSync(prefix);
  t.after(() => {
    assert.ok(realpathSync(root).startsWith(prefix) && root !== tmpdir());
    rmSync(root, { recursive: true, force: true }); // Exact validated directory created by this test.
  });
  mkdirSync(join(root, 'assets'));
  writeFileSync(join(root, 'index.html'), '<!doctype html><script type="module" src="/assets/index-Abc123.js"></script><link href="/assets/index-Def456.css" rel="stylesheet">');
  writeFileSync(join(root, 'assets', 'index-Abc123.js'), 'console.log("fixture");');
  writeFileSync(join(root, 'assets', 'index-Def456.css'), 'body{color:black}');
  stampArtifact(root, sha);
  return root;
}
function viewer(root, overrides = {}) {
  return async (url, options) => {
    assert.equal(options.redirect, 'error');
    assert.equal(options.headers.Authorization, undefined);
    const parsed = new URL(url);
    assert.equal(parsed.origin, targets.origin);
    const path = parsed.pathname;
    if (overrides[path]) return overrides[path]();
    if (path.startsWith('/api/')) return new Response(JSON.stringify({ code: 1000 }), {
      status: path === '/api/auth/my-info' ? 401 : 200, headers: { 'content-type': 'application/json' },
    });
    const file = path === '/products' ? 'index.html' : path.slice(1);
    return new Response(readFileSync(join(root, file)), { status: 200, headers: { 'content-type':
      path === '/products' ? 'text/html' : path.endsWith('.css') ? 'text/css' : path.endsWith('.js') ? 'application/javascript' : 'application/json' } });
  };
}

test('only owned main push or dispatch, exact role and bounded run metadata can deploy', () => {
  assert.equal(context(env).sha, sha);
  assert.ok(context({ ...env, GITHUB_EVENT_NAME: 'workflow_dispatch' }));
  for (const patch of [{ GITHUB_REPOSITORY: 'someone/fork' }, { GITHUB_REF: 'refs/heads/feature' },
    { GITHUB_EVENT_NAME: 'pull_request' }, { GITHUB_SHA: 'main' }, { GITHUB_RUN_ID: '1; echo bad' },
    { GITHUB_RUN_ATTEMPT: '0' }, { AWS_DEPLOY_ROLE_ARN: targets.roleArn + '-admin' }, { AWS_DEPLOY_ROLE_ARN: '' }]) {
    assert.throws(() => context({ ...env, ...patch }));
  }
});

test('release stamp binds the index and actual assets to the commit; no fake marker overwrite', (t) => {
  const root = fixture(t);
  assert.equal(inspectArtifact(root, sha).fileCount, 4);
  assert.throws(() => inspectArtifact(root, 'b'.repeat(40)), /ARTIFACT_COMMIT_OR_HASH/);
  assert.throws(() => stampArtifact(root, sha), /EEXIST/);
  writeFileSync(join(root, 'index.html'), readFileSync(join(root, 'index.html'), 'utf8') + '<!-- changed -->');
  assert.throws(() => inspectArtifact(root, sha), /ARTIFACT_COMMIT_OR_HASH/);
});

test('artifact validation rejects env, source maps, missing chunks, unexpected directories and oversized files', (t) => {
  for (const [path, content] of [['.env', 'secret'], ['assets/index.js.map', '{}'], ['private/secret.txt', 'private'], ['images/large.png', Buffer.alloc(5 * 1024 * 1024 + 1)]]) {
    const root = fixture(t);
    if (path.includes('/')) mkdirSync(join(root, path.split('/')[0]), { recursive: true });
    writeFileSync(join(root, path), content);
    assert.throws(() => inspectArtifact(root, sha));
  }
  const root = fixture(t);
  rmSync(join(root, 'assets', 'index-Abc123.js'));
  assert.throws(() => inspectArtifact(root, sha), /ARTIFACT_REFERENCES/);
});

test('main lookup rejects missing/malformed refs and identifies superseded commits', () => {
  assert.equal(isLatestMain(sha, () => `${sha}\trefs/heads/main\n`), true);
  assert.equal(isLatestMain(sha, () => `${'b'.repeat(40)}\trefs/heads/main\n`), false);
  for (const response of ['', `${sha}\trefs/heads/other`, 'unexpected']) assert.throws(() => isLatestMain(sha, () => response));
});

test('symlink/junction directories are rejected without traversal', (t) => {
  const root = fixture(t);
  symlinkSync(root, join(root, 'assets', 'loop'), 'junction');
  assert.throws(() => inspectArtifact(root, sha), /ARTIFACT_SYMLINK/);
});

test('publish order preserves old chunks, encryption, cache policy and index-last without ACL/delete', () => {
  const commands = publishCommands('dist', context(env));
  assert.equal(commands.length, 5);
  assert.deepEqual(commands.map((c) => c.slice(0, 2)), [['s3', 'sync'], ['s3', 'sync'], ['s3', 'cp'], ['s3', 'cp'], ['cloudfront', 'create-invalidation']]);
  assert.ok(commands[0].includes(`s3://${targets.bucket}/assets/`));
  assert.ok(commands[0].includes('public,max-age=31536000,immutable'));
  assert.ok(commands[3].includes(`s3://${targets.bucket}/index.html`));
  assert.ok(commands[3].includes('no-cache,max-age=0,must-revalidate'));
  for (const command of commands.slice(0, 4)) {
    assert.ok(command.includes('AES256') && command.includes('--no-follow-symlinks'));
    assert.ok(!command.includes('--delete') && !command.includes('--acl') && !command.includes('--no-verify-ssl'));
  }
  const batch = JSON.parse(commands[4][commands[4].indexOf('--invalidation-batch') + 1]);
  assert.deepEqual(batch.Paths, { Quantity: 1, Items: ['/*'] });
  assert.equal(batch.CallerReference, `shop-ui-${sha}-123-1`);
});

test('publish waits for invalidation then checks the exact public release, assets, JSON API and private 401', async (t) => {
  const root = fixture(t);
  const calls = [];
  const result = await publish(root, env, { latest: () => true, request: viewer(root), aws: (args) => {
    calls.push(args);
    return args[0] === 'cloudfront' && args[1] === 'create-invalidation' ? 'IEXAMPLE123' : '';
  } });
  assert.equal(result.deployed, true);
  assert.equal(result.checks.anonymousDenied, true);
  assert.equal(calls.length, 6);
  assert.deepEqual(calls[5].slice(0, 3), ['cloudfront', 'wait', 'invalidation-completed']);
  assert.equal(JSON.stringify(result).includes('Authorization'), false);
});

test('old main rerun does not mutate S3 or invalidate', async (t) => {
  const result = await publish(fixture(t), env, { latest: () => false, aws: () => assert.fail('stale run touched AWS') });
  assert.deepEqual(result, { deployed: false, reason: 'SUPERSEDED_MAIN' });
});

test('failed upload stops before index/invalidation; failed waiter stops before smoke', async (t) => {
  const root = fixture(t);
  let calls = 0;
  await assert.rejects(publish(root, env, { latest: () => true, aws: () => { if (++calls === 1) throw new Error('upload failed'); }, request: () => assert.fail('smoke after failure') }));
  assert.equal(calls, 1);
  await assert.rejects(publish(root, env, { latest: () => true, aws: (args) => {
    if (args[1] === 'wait') throw new Error('wait failed');
    return args[1] === 'create-invalidation' ? 'IEXAMPLE123' : '';
  }, request: () => assert.fail('smoke before completion') }));
});

test('viewer smoke refuses stale index/release, HTML API fallback, missing assets and public private API', async (t) => {
  const root = fixture(t), artifact = inspectArtifact(root, sha);
  for (const [path, response] of [
    ['/release.json', () => new Response(JSON.stringify({ commit: 'old' }), { headers: { 'content-type': 'application/json' } })],
    ['/products', () => new Response('<html>old</html>', { headers: { 'content-type': 'text/html' } })],
    ['/assets/index-Abc123.js', () => new Response('missing', { status: 404 })],
    ['/api/catalog/products', () => new Response('<html>SPA</html>', { headers: { 'content-type': 'text/html' } })],
    ['/api/auth/my-info', () => new Response('{}', { status: 200, headers: { 'content-type': 'application/json' } })],
  ]) await assert.rejects(smoke(context(env), artifact, viewer(root, { [path]: response })));
});

test('viewer smoke bounds response bytes before parsing or retaining an oversized response', async (t) => {
  const root = fixture(t);
  await assert.rejects(smoke(context(env), inspectArtifact(root, sha), viewer(root, {
    '/release.json': () => new Response(Buffer.alloc(2 * 1024 * 1024 + 1), { headers: { 'content-type': 'application/json' } }),
  })), /SMOKE_RESPONSE_SIZE/);
});

test('workflow isolates credential job, retains required checks, pins actions and never deploys PR artifacts', () => {
  const workflow = readFileSync(new URL('../.github/workflows/ci.yml', import.meta.url), 'utf8');
  assert.match(workflow, /pull_request:/);
  assert.match(workflow, /needs: verify/);
  assert.match(workflow, /vars\.UI_DEPLOY_ENABLED == 'true'/);
  assert.match(workflow, /github\.repository == 'triramisu\/shop-ui'/);
  assert.match(workflow, /cancel-in-progress: \$\{\{ github\.event_name == 'pull_request' \}\}/);
  const [build, deploy] = workflow.split('\n  deploy:\n');
  assert.ok(!build.includes('id-token: write') && !build.includes('aws-access-key-id'));
  assert.match(build, /npm audit --audit-level=moderate/);
  assert.match(build, /fail-on-severity: moderate/);
  assert.match(deploy, /id-token: write/);
  assert.ok(!deploy.includes('npm ci') && !deploy.includes('pull_request_target') && !deploy.includes('workflow_run'));
  assert.ok(deploy.indexOf('ui-deploy.mjs preflight') < deploy.indexOf('aws-actions/configure-aws-credentials'));
  assert.equal((workflow.match(/name: shop-ui-\$\{\{ github.sha \}\}-\$\{\{ github.run_id \}\}/g) ?? []).length, 2, 'retry deploy reuses this run\'s verified artifact, not a missing new-attempt artifact');
  for (const [, action] of workflow.matchAll(/uses: ([^\s]+)/g)) assert.match(action, /@[a-f0-9]{40}$/);
});

test('IAM grants only the four approved actions on UI resources and trusts exact main subject', () => {
  const policy = JSON.parse(readFileSync(new URL('../deploy/aws/ui-publish-policy.json', import.meta.url), 'utf8'));
  assert.deepEqual(policy.Statement.flatMap((s) => s.Action).sort(), ['cloudfront:CreateInvalidation', 'cloudfront:GetInvalidation', 's3:ListBucket', 's3:PutObject'].sort());
  assert.ok(policy.Statement.every((s) => s.Effect === 'Allow' && s.Resource !== '*'));
  assert.equal(policy.Statement[0].Resource, `arn:aws:s3:::${targets.bucket}`);
  assert.equal(policy.Statement[1].Resource, `arn:aws:s3:::${targets.bucket}/*`);
  assert.equal(policy.Statement[2].Resource, `arn:aws:cloudfront::${targets.accountId}:distribution/${targets.distributionId}`);
  const trust = JSON.parse(readFileSync(new URL('../deploy/aws/github-trust.json', import.meta.url), 'utf8')).Statement[0];
  assert.equal(trust.Action, 'sts:AssumeRoleWithWebIdentity');
  assert.equal(trust.Principal.Federated, `arn:aws:iam::${targets.accountId}:oidc-provider/token.actions.githubusercontent.com`);
  assert.deepEqual(trust.Condition.StringEquals, { 'token.actions.githubusercontent.com:aud': 'sts.amazonaws.com', 'token.actions.githubusercontent.com:sub': 'repo:triramisu@200755440/shop-ui@1421523514:ref:refs/heads/main' });
  assert.notEqual(trust.Condition.StringEquals['token.actions.githubusercontent.com:sub'], `repo:${targets.repository}:ref:refs/heads/main`, 'this repository uses immutable owner/repository IDs; legacy name-only subject is rejected by STS');
});

test('CLI refuses untrusted context before network access and never echoes env/role values', () => {
  const marker = 'FIXTURE_ONLY_DO_NOT_ECHO_123';
  const result = spawnSync(process.execPath, [fileURLToPath(new URL('../scripts/ui-deploy.mjs', import.meta.url)), 'preflight'], {
    env: { ...process.env, ...env, GITHUB_REPOSITORY: 'someone/fork', AWS_SECRET_ACCESS_KEY: marker, AWS_DEPLOY_ROLE_ARN: marker }, encoding: 'utf8', timeout: 10000,
  });
  assert.equal(result.status, 1);
  assert.match(result.stderr, /MAIN_REPOSITORY_REQUIRED/);
  assert.ok(!(result.stdout + result.stderr).includes(marker));
});
