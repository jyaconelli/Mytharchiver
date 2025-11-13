import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath, pathToFileURL } from 'url';

const projectRoot = path.resolve(fileURLToPath(new URL('.', import.meta.url)), '..');
const buildDir = path.resolve(projectRoot, 'build');
const ssrBuildDir = path.resolve(projectRoot, 'build-ssr');
const templatePath = path.join(buildDir, 'index.html');

const routesToPrerender = [
  { url: '/', output: 'index.html' },
  { url: '/auth', output: path.join('auth', 'index.html') },
  { url: '/myths/placeholder', output: path.join('myths', 'dynamic', 'index.html') },
  {
    url: '/myths/placeholder/variants/example',
    output: path.join('myths', 'dynamic-variant', 'index.html'),
  },
  {
    url: '/myths/placeholder/canonicalization',
    output: path.join('myths', 'dynamic-canonicalization', 'index.html'),
  },
  { url: '/contribute/example-token', output: path.join('contribute', 'dynamic', 'index.html') },
];

async function resolveServerEntry() {
  const candidates = ['entry-server.mjs', 'entry-server.js', 'entry-server.cjs'];
  for (const candidate of candidates) {
    const filePath = path.join(ssrBuildDir, candidate);
    try {
      await fs.access(filePath);
      return filePath;
    } catch (error) {
      // ignore missing files
    }
  }
  throw new Error(`Unable to locate server bundle in ${ssrBuildDir}`);
}

async function loadServerRenderer() {
  const serverEntry = await resolveServerEntry();
  const module = await import(pathToFileURL(serverEntry).href);
  if (typeof module.render !== 'function') {
    throw new Error('Server entry does not export a render() function');
  }
  return module.render;
}

async function readTemplate() {
  try {
    return await fs.readFile(templatePath, 'utf-8');
  } catch (error) {
    throw new Error(`Unable to read built index.html at ${templatePath}: ${error}`);
  }
}

function injectMarkup(template, markup) {
  const placeholder = '<div id="root"></div>';
  if (!template.includes(placeholder)) {
    throw new Error('Unable to locate <div id="root"></div> placeholder in index.html');
  }
  return template.replace(placeholder, `<div id="root">${markup}</div>`);
}

async function writeRouteHtml(outputRelativePath, html) {
  const fullPath = path.join(buildDir, outputRelativePath);
  await fs.mkdir(path.dirname(fullPath), { recursive: true });
  await fs.writeFile(fullPath, html, 'utf-8');
}

async function prerender() {
  const [template, render] = await Promise.all([readTemplate(), loadServerRenderer()]);

  for (const route of routesToPrerender) {
    const appHtml = await render(route.url);
    const html = injectMarkup(template, appHtml);
    await writeRouteHtml(route.output, html);
    console.log(`Pre-rendered ${route.url} -> ${route.output}`);
  }
}

prerender().catch((error) => {
  console.error(error);
  process.exit(1);
});
