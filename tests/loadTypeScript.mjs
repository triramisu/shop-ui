import { readFileSync } from 'node:fs';
import ts from 'typescript';

let sequence = 0;
export function compile(relative) {
  return ts.transpileModule(
    readFileSync(new URL(relative, import.meta.url), 'utf8'),
    {
      compilerOptions: {
        target: ts.ScriptTarget.ES2022,
        module: ts.ModuleKind.ESNext,
      },
    },
  ).outputText;
}

export function moduleUrl(source) {
  return `data:text/javascript;base64,${Buffer.from(`${source}\n// test-module-${sequence++}`).toString('base64')}`;
}

export async function loadClient() {
  const storage = new Map();
  globalThis.localStorage = {
    getItem: (key) => storage.get(key) ?? null,
    setItem: (key, value) => storage.set(key, value),
    removeItem: (key) => storage.delete(key),
  };
  const sessionUrl = moduleUrl(compile('../src/lib/session.ts'));
  const session = await import(sessionUrl);
  const code = compile('../src/lib/apiClient.ts')
    .replace(/from ['"]\.\/session['"]/, `from '${sessionUrl}'`)
    .replace('import.meta.env.VITE_API_BASE_URL', '"/api"');
  const client = await import(moduleUrl(code));
  return { session, client };
}
