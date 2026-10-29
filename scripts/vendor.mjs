// Refreshes self-hosted libraries, fonts and icons from node_modules.
// Usage: npm install && npm run vendor
import fs from 'node:fs';
import path from 'node:path';
import { build } from 'esbuild';

const ROOT = path.resolve(path.dirname(new URL(import.meta.url).pathname), '..');
const NM = path.join(ROOT, 'node_modules');
const ASSETS = path.join(ROOT, 'public/assets');
const cp = (from, to) => { fs.copyFileSync(path.join(NM, from), path.join(ASSETS, to)); console.log('✓', to); };

for (const f of ['gsap', 'ScrollTrigger', 'SplitText', 'Draggable', 'InertiaPlugin', 'MotionPathPlugin', 'Observer', 'CustomEase']) cp(`gsap/dist/${f}.min.js`, `vendor/${f}.min.js`);
cp('lenis/dist/lenis.min.js', 'vendor/lenis.min.js');
cp('matter-js/build/matter.min.js', 'vendor/matter.min.js');

// three.js no longer ships a minified build: bundle only what gl.js uses (tree-shaken).
await build({
  stdin: { contents: "export { WebGLRenderer, Scene, PerspectiveCamera, OrthographicCamera, Mesh, Points, IcosahedronGeometry, PlaneGeometry, BufferGeometry, BufferAttribute, ShaderMaterial, Color, Vector2, AdditiveBlending, REVISION } from 'three';", resolveDir: ROOT },
  bundle: true, format: 'esm', minify: true, legalComments: 'inline', outfile: path.join(ASSETS, 'vendor/three.min.js'), logLevel: 'warning',
});
console.log('✓ vendor/three.min.js');

cp('@fontsource-variable/space-grotesk/files/space-grotesk-latin-wght-normal.woff2', 'fonts/space-grotesk.woff2');
cp('@fontsource-variable/dm-sans/files/dm-sans-latin-opsz-normal.woff2', 'fonts/dm-sans.woff2');
cp('@fontsource-variable/manrope/files/manrope-latin-wght-normal.woff2', 'fonts/manrope.woff2');

for (const icon of fs.readdirSync(path.join(ASSETS, 'img/icons'))) {
  const src = `simple-icons/icons/${icon}`;
  if (fs.existsSync(path.join(NM, src))) cp(src, `img/icons/${icon}`);
}
