// No SDK/dependencies, npm scripts, credential output or shell interpolation in the AWS job.
import { execFileSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { appendFileSync, lstatSync, readFileSync, readdirSync, writeFileSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

export const targets = JSON.parse(readFileSync(new URL('../deploy/production.json', import.meta.url), 'utf8'));
const sha256 = (bytes) => createHash('sha256').update(bytes).digest('hex');
function requireValue(condition, code) { if (!condition) throw new Error(code); }

export function context(env) {
  requireValue(env.GITHUB_REPOSITORY === targets.repository && env.GITHUB_REF === 'refs/heads/main', 'MAIN_REPOSITORY_REQUIRED');
  requireValue(['push', 'workflow_dispatch'].includes(env.GITHUB_EVENT_NAME), 'DEPLOY_EVENT_REJECTED');
  requireValue(/^[a-f0-9]{40}$/.test(env.GITHUB_SHA ?? ''), 'COMMIT_REQUIRED');
  requireValue(/^[1-9][0-9]*$/.test(env.GITHUB_RUN_ID ?? '') && /^[1-9][0-9]*$/.test(env.GITHUB_RUN_ATTEMPT ?? ''), 'RUN_REQUIRED');
  requireValue(env.AWS_DEPLOY_ROLE_ARN === targets.roleArn, 'APPROVED_ROLE_REQUIRED');
  return { sha: env.GITHUB_SHA, run: env.GITHUB_RUN_ID, attempt: env.GITHUB_RUN_ATTEMPT };
}

export function inspectArtifact(directory, expectedSha, stamped = true) {
  requireValue(/^[a-f0-9]{40}$/.test(expectedSha ?? ''), 'COMMIT_REQUIRED');
  const files = [];
  let total = 0;
  function walk(prefix = '') {
    for (const name of readdirSync(join(directory, prefix))) {
      requireValue(/^[A-Za-z0-9][A-Za-z0-9_.-]*$/.test(name), 'ARTIFACT_PATH');
      const relative = prefix ? `${prefix}/${name}` : name;
      const stat = lstatSync(join(directory, relative));
      requireValue(!stat.isSymbolicLink(), 'ARTIFACT_SYMLINK');
      if (stat.isDirectory()) {
        requireValue(['assets', 'fonts', 'images'].includes(relative), 'ARTIFACT_DIRECTORY');
        walk(relative);
      } else {
        requireValue(stat.isFile() && stat.size > 0 && stat.size <= 5 * 1024 * 1024, 'ARTIFACT_FILE_SIZE');
        requireValue(['index.html', 'release.json', 'favicon.svg'].includes(relative) ||
          /^(assets|fonts|images)\/[A-Za-z0-9_.-]+\.(js|css|png|jpe?g|webp|avif|svg|ico|woff2?|ttf|txt|md)$/.test(relative), 'ARTIFACT_FILE_TYPE');
        total += stat.size;
        files.push(relative);
      }
    }
  }
  requireValue(lstatSync(directory).isDirectory() && !lstatSync(directory).isSymbolicLink(), 'ARTIFACT_ROOT');
  walk();
  requireValue(files.length <= 200 && total <= 30 * 1024 * 1024 && files.includes('index.html'), 'ARTIFACT_LIMIT');
  const html = readFileSync(join(directory, 'index.html'));
  const assets = [...html.toString('utf8').matchAll(/(?:src|href)="(\/assets\/[^"?#]+)"/g)].map((m) => m[1]);
  requireValue(assets.some((path) => path.endsWith('.js')) && assets.every((path) => files.includes(path.slice(1))), 'ARTIFACT_REFERENCES');
  if (stamped) {
    const stamp = JSON.parse(readFileSync(join(directory, 'release.json'), 'utf8'));
    requireValue(stamp.commit === expectedSha && stamp.indexSha256 === sha256(html), 'ARTIFACT_COMMIT_OR_HASH');
  }
  return { htmlHash: sha256(html), assets, fileCount: files.length };
}

export function stampArtifact(directory, sha) {
  const artifact = inspectArtifact(directory, sha, false);
  writeFileSync(join(directory, 'release.json'), JSON.stringify({ commit: sha, indexSha256: artifact.htmlHash }) + '\n', { flag: 'wx' });
  return inspectArtifact(directory, sha);
}

export function isLatestMain(sha, git = (args) => execFileSync('git', args, { encoding: 'utf8', timeout: 20000, stdio: ['ignore', 'pipe', 'pipe'] })) {
  const remote = git(['ls-remote', 'origin', 'refs/heads/main']).trim();
  requireValue(/^[a-f0-9]{40}\s+refs\/heads\/main$/.test(remote), 'MAIN_LOOKUP_FAILED');
  return remote.split(/\s/)[0] === sha;
}

export function publishCommands(directory, ctx) {
  const destination = `s3://${targets.bucket}`;
  const upload = ['--sse', 'AES256', '--no-follow-symlinks', '--only-show-errors'];
  const batch = { Paths: { Quantity: 1, Items: ['/*'] }, CallerReference: `shop-ui-${ctx.sha}-${ctx.run}-${ctx.attempt}` };
  return [
    ['s3', 'sync', join(directory, 'assets'), `${destination}/assets/`, ...upload, '--cache-control', 'public,max-age=31536000,immutable'],
    ['s3', 'sync', directory, `${destination}/`, ...upload, '--exclude', 'assets/*', '--exclude', 'index.html', '--exclude', 'release.json', '--cache-control', 'public,max-age=300'],
    ['s3', 'cp', join(directory, 'release.json'), `${destination}/release.json`, ...upload, '--content-type', 'application/json', '--cache-control', 'no-store,max-age=0'],
    ['s3', 'cp', join(directory, 'index.html'), `${destination}/index.html`, ...upload, '--content-type', 'text/html; charset=utf-8', '--cache-control', 'no-cache,max-age=0,must-revalidate'],
    ['cloudfront', 'create-invalidation', '--distribution-id', targets.distributionId, '--invalidation-batch', JSON.stringify(batch), '--query', 'Invalidation.Id', '--output', 'text'],
  ];
}

async function getPublic(path, request) {
  const response = await request(targets.origin + path, { redirect: 'error', signal: AbortSignal.timeout(15000), headers: { Accept: '*/*' } });
  const reader = response.body?.getReader();
  requireValue(!!reader, 'SMOKE_RESPONSE_BODY');
  const parts = [];
  let size = 0;
  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      size += value.length;
      requireValue(size <= 2 * 1024 * 1024, 'SMOKE_RESPONSE_SIZE');
      parts.push(value);
    }
  } finally { await reader.cancel(); }
  const bytes = Buffer.concat(parts, size);
  return { response, bytes, text: new TextDecoder().decode(bytes) };
}

export async function smoke(ctx, artifact, request = fetch) {
  const marker = await getPublic(`/release.json?release=${ctx.sha}`, request);
  requireValue(marker.response.status === 200 && (marker.response.headers.get('content-type') ?? '').includes('application/json'), 'VIEWER_RELEASE_RESPONSE');
  const value = JSON.parse(marker.text);
  requireValue(value.commit === ctx.sha && value.indexSha256 === artifact.htmlHash, 'VIEWER_RELEASE_MISMATCH');
  const page = await getPublic(`/products?release=${ctx.sha}`, request);
  requireValue(page.response.status === 200 && (page.response.headers.get('content-type') ?? '').includes('text/html') && sha256(page.bytes) === artifact.htmlHash, 'VIEWER_INDEX_MISMATCH');
  for (const path of artifact.assets) {
    const asset = await getPublic(path, request);
    requireValue(asset.response.status === 200 && (asset.response.headers.get('content-type') ?? '').includes(path.endsWith('.css') ? 'text/css' : 'javascript'), 'VIEWER_ASSET_RESPONSE');
  }
  const catalog = await getPublic('/api/catalog/products?page=0&size=1', request);
  requireValue(catalog.response.status === 200 && (catalog.response.headers.get('content-type') ?? '').includes('application/json') && JSON.parse(catalog.text).code === 1000, 'CATALOG_SMOKE');
  const privateApi = await getPublic('/api/auth/my-info', request);
  requireValue(privateApi.response.status === 401 && (privateApi.response.headers.get('content-type') ?? '').includes('application/json'), 'AUTH_SMOKE');
  return { viewer: true, assets: artifact.assets.length, catalog: true, anonymousDenied: true };
}

export async function publish(directory, env, { aws, request = fetch, latest = isLatestMain } = {}) {
  const ctx = context(env);
  const artifact = inspectArtifact(directory, ctx.sha);
  if (!latest(ctx.sha)) return { deployed: false, reason: 'SUPERSEDED_MAIN' };
  requireValue(typeof aws === 'function', 'AWS_EXECUTOR_REQUIRED');
  let id;
  for (const command of publishCommands(directory, ctx)) id = aws(command).trim();
  requireValue(/^[A-Z0-9]{6,64}$/.test(id), 'INVALIDATION_ID');
  aws(['cloudfront', 'wait', 'invalidation-completed', '--distribution-id', targets.distributionId, '--id', id]);
  const checks = await smoke(ctx, artifact, request);
  return { deployed: true, commit: ctx.sha, invalidation: id, checks };
}

async function main() {
  const directory = resolve('dist');
  const mode = process.argv[2];
  if (mode === 'prepare') {
    stampArtifact(directory, process.env.GITHUB_SHA);
    console.log(JSON.stringify({ prepared: true, commit: process.env.GITHUB_SHA }));
  } else if (mode === 'preflight') {
    const ctx = context(process.env);
    inspectArtifact(directory, ctx.sha);
    const latest = isLatestMain(ctx.sha);
    requireValue(!!process.env.GITHUB_OUTPUT, 'GITHUB_OUTPUT_REQUIRED');
    appendFileSync(process.env.GITHUB_OUTPUT, `deploy=${latest}\nregion=${targets.region}\naccount=${targets.accountId}\nrole=${targets.roleArn}\n`);
    console.log(JSON.stringify({ valid: true, latestMain: latest }));
  } else if (mode === 'publish') {
    const result = await publish(directory, process.env, { aws: (args) => {
      try {
        return execFileSync('aws', [...args, '--region', targets.region, '--no-cli-pager', '--cli-connect-timeout', '10', '--cli-read-timeout', '30'], {
          encoding: 'utf8', timeout: 660000, maxBuffer: 262144, stdio: ['ignore', 'pipe', 'pipe'],
        });
      } catch {
        // Fixed operation name only; never raw stderr, request headers or credentials.
        console.error(JSON.stringify({ awsOperation: args.slice(0, 2).join(' '), failed: true }));
        throw new Error('AWS_OPERATION_FAILED');
      }
    } });
    console.log(JSON.stringify(result));
    if (process.env.GITHUB_STEP_SUMMARY) appendFileSync(process.env.GITHUB_STEP_SUMMARY, `## UI deployment\n\n\`\`\`json\n${JSON.stringify(result, null, 2)}\n\`\`\`\n`);
  } else throw new Error('COMMAND_REQUIRED');
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  main().catch((error) => {
    const code = /^[A-Z][A-Z0-9_]{2,80}$/.test(error?.message ?? '') ? error.message : 'UNEXPECTED_FAILURE';
    console.error(`UI_DEPLOY_FAILED: ${code}; no credentials or response bodies emitted.`);
    process.exitCode = 1;
  });
}
