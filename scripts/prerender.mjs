import { build } from 'vite';
import { mkdir, readFile, rm, writeFile } from 'fs/promises';
import path from 'path';
import { fileURLToPath, pathToFileURL } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const projectRoot = path.resolve(__dirname, '..');
const clientOutDir = path.join(projectRoot, 'build');
const ssrOutDir = path.join(projectRoot, 'build-ssr');

const routesToPrerender = [
  { url: '/', output: 'index.html', options: { authLoading: true } },
  { url: '/auth', output: path.join('auth', 'index.html'), options: { authLoading: false } },
];

async function ensureClientBuild() {
  // Verify the client build exists; if not, prompt developer.
  // We don't trigger the client build here to keep behavior predictable.
  try {
    await readFile(path.join(clientOutDir, 'index.html'), 'utf8');
  } catch (error) {
    throw new Error(
      'Client build not found. Run "vite build" before executing the prerender script.',
    );
  }
}

async function buildSsrBundle() {
  await build({
    root: projectRoot,
    logLevel: 'error',
    build: {
      ssr: true,
      outDir: ssrOutDir,
      emptyOutDir: true,
      rollupOptions: {
        input: path.join(projectRoot, 'src', 'static-entry.tsx'),
        output: {
          entryFileNames: 'static-entry.mjs',
          format: 'esm',
        },
      },
    },
  });
}

async function renderRoutes() {
  const template = await readFile(path.join(clientOutDir, 'index.html'), 'utf8');
  const ssrEntryUrl = pathToFileURL(path.join(ssrOutDir, 'static-entry.mjs')).href;
  const { render } = await import(ssrEntryUrl);

  for (const route of routesToPrerender) {
    const result = await render(route.url, route.options);
    const finalUrl = result.redirect ?? route.url;

    let ssrHtml = result.html;
    let bootstrap = result.bootstrap ?? null;

    if (finalUrl !== route.url) {
      const redirected = await render(finalUrl, route.options);
      ssrHtml = redirected.html;
      bootstrap = redirected.bootstrap ?? bootstrap;
    }

    const bootstrapScript = createBootstrapScript(bootstrap);

    const document = template.replace(
      '<div id="root"></div>',
      `<div id="root">${ssrHtml}</div>`,
    ).replace('</body>', `${bootstrapScript}\n</body>`);

    const outputPath = path.join(clientOutDir, route.output);
    await mkdir(path.dirname(outputPath), { recursive: true });
    await writeFile(outputPath, document, 'utf8');
  }
}

async function cleanSsrArtifacts() {
  await rm(ssrOutDir, { recursive: true, force: true });
}

async function main() {
  await ensureClientBuild();
  await buildSsrBundle();
  await renderRoutes();
  await cleanSsrArtifacts();
}

main().catch((error) => {
  console.error('[prerender] Failed to generate static pages:', error);
  process.exitCode = 1;
});

function createBootstrapScript(bootstrap) {
  const safe = bootstrap ? escapeForScript(bootstrap) : 'null';
  return `<script id="bootstrap-auth">window.__PRELOADED_AUTH__=${safe};</script>`;
}

function escapeForScript(value) {
  return JSON.stringify(value).replace(/</g, '\\u003c');
}
