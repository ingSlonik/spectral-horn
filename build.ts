import * as esbuild from 'esbuild';
import { minify as minifyJs } from 'terser';
import { Packer } from 'roadroller';
import * as csso from 'csso';
import { minify as minifyHtml } from 'html-minifier-terser';
import ect from 'ect-bin';
import * as fs from 'node:fs';
import * as path from 'node:path';
import { execFileSync } from 'node:child_process';
import process from 'node:process';

const JS13K_LIMIT_BYTES = 13312;

async function build() {
  console.log('🚀 Starting Spectral Horn JS13k build...');
  const startTime = Date.now();

  const distDir = path.resolve('dist');
  if (!fs.existsSync(distDir)) {
    fs.mkdirSync(distDir, { recursive: true });
  }

  // 1. Bundle TypeScript to JavaScript with esbuild
  console.log('\n📦 Step 1: Bundling TypeScript with esbuild...');
  const bundleResult = await esbuild.build({
    entryPoints: ['src/game.ts'],
    bundle: true,
    write: false,
    format: 'iife',
    target: 'es2020',
    treeShaking: true,
    legalComments: 'none',
    minify: true,
  });

  const bundledJs = bundleResult.outputFiles[0].text;
  console.log(`   Bundle size: ${(bundledJs.length / 1024).toFixed(2)} KB (${bundledJs.length} bytes)`);

  // 2. Minify JavaScript with Terser (with property mangling)
  console.log('\n⚡ Step 2: Minifying JavaScript with Terser & Property Mangling...');

  const terserResult = await minifyJs(bundledJs, {
    ecma: 2020,
    compress: {
      passes: 20,
      unsafe: true,
      unsafe_math: true,
      unsafe_arrows: true,
      unsafe_methods: true,
      unsafe_proto: true,
      unsafe_comps: true,
      unsafe_Function: true,
      unsafe_symbols: true,
      unsafe_undefined: true,
      pure_getters: true,
      drop_console: true,
      booleans_as_integers: true,
      collapse_vars: true,
      reduce_vars: true,
      evaluate: true,
      hoist_funs: true,
      hoist_vars: true,
      inline: 3,
      loops: true,
      toplevel: true,
      keep_fargs: false,
    },
    mangle: {
      toplevel: true,
      properties: {
        reserved: [],
      },
    },
    format: {
      comments: false,
    },
  });

  const minifiedJs = terserResult.code || '';
  console.log(`   Terser JS size: ${(minifiedJs.length / 1024).toFixed(2)} KB (${minifiedJs.length} bytes)`);

  // 3. Minify CSS with CSSO
  console.log('\n🎨 Step 3: Minifying CSS with CSSO...');
  const rawCss = fs.readFileSync('src/style.css', 'utf8');
  const cssoResult = csso.minify(rawCss, {
    restructure: true,
    comments: false,
  });
  const minifiedCss = cssoResult.css;
  console.log(`   CSS size: ${(rawCss.length / 1024).toFixed(2)} KB -> ${(minifiedCss.length / 1024).toFixed(2)} KB (${minifiedCss.length} bytes)`);

  // 4. Minify HTML skeleton (without JS)
  console.log('\n📄 Step 4: Minifying HTML skeleton with html-minifier-terser...');
  const rawHtml = fs.readFileSync('index.html', 'utf8');
  const inlinedHtml = rawHtml
    .replace(/<link\s+rel="stylesheet"\s+href="[^"]*">/i, `<style>${minifiedCss}</style>`)
    .replace(/<script[^>]*src=[^>]*><\/script>/i, '');

  const minifiedSkeleton = await minifyHtml(inlinedHtml, {
    collapseWhitespace: true,
    removeAttributeQuotes: true,
    removeOptionalTags: true,
    collapseBooleanAttributes: true,
    removeEmptyAttributes: true,
    removeComments: true,
    removeRedundantAttributes: true,
    removeScriptTypeAttributes: true,
    removeStyleLinkTypeAttributes: true,
    decodeEntities: true,
    sortAttributes: true,
    sortClassName: true,
    useShortDoctype: true,
    minifyCSS: true,
    minifyJS: false,
  });

  // fs.writeFileSync(path.resolve("dist", 'index_skeletone.js'), minifiedJs);
  // fs.writeFileSync(path.resolve("dist", 'index_skeletone.html'), minifiedSkeleton + "<script>" + minifiedJs + "</script>");

  // 5. Roadroller Unified Crusher (Compresses HTML + CSS + JavaScript in a single JS payload)
  console.log('\n🛞 Step 5: Crushing HTML + CSS + JavaScript with Roadroller...');
  const escapedSkeleton = minifiedSkeleton.replace(/\\/g, '\\\\').replace(/'/g, "\\'");
  const combinedJs = `document.write('${escapedSkeleton}');\n${minifiedJs}`;
  const roadrollerStart = Date.now();
  const packer = new Packer(
    [
      {
        data: combinedJs,
        type: 'js' as any,
        action: 'eval' as any,
      },
    ],
    {
      allowFreeVars: true,
      dynamicModels: 1,
    }
  );
  await packer.optimize(2);
  const { firstLine, secondLine } = packer.makeDecoder();
  const roadrolledJs = firstLine + secondLine;
  console.log(
    `   Roadroller output size: ${(roadrolledJs.length / 1024).toFixed(2)} KB (${roadrolledJs.length} bytes) [took ${Date.now() - roadrollerStart}ms]`
  );

  const finalHtml = `<script>${roadrolledJs}</script>`;
  const htmlDistPath = path.join(distDir, 'index.html');
  fs.writeFileSync(htmlDistPath, finalHtml, 'utf8');
  const htmlSize = fs.statSync(htmlDistPath).size;
  console.log(`   Single HTML output size: ${(htmlSize / 1024).toFixed(2)} KB (${htmlSize} bytes)`);

  // 5. Compress with ECT for maximum ZIP compression
  console.log('\n🗜️  Step 5: Compressing archive with ECT (max compression)...');
  const zipName = 'spectral-horn.zip';
  const zipPath = path.join(distDir, zipName);

  if (fs.existsSync(zipPath)) {
    fs.unlinkSync(zipPath);
  }

  // Run ECT with maximum compression (-9), stripped metadata (-strip), ZIP format (-zip)
  execFileSync(ect, ['-9', '-strip', '-zip', zipName, 'index.html'], {
    cwd: distDir,
    stdio: 'pipe',
  });

  const zipSize = fs.statSync(zipPath).size;
  const remainingBytes = JS13K_LIMIT_BYTES - zipSize;
  const percentUsed = ((zipSize / JS13K_LIMIT_BYTES) * 100).toFixed(2);
  const elapsedMs = Date.now() - startTime;

  // Print Summary
  console.log('\n======================================================');
  console.log(`🎉 BUILD FINISHED in ${elapsedMs}ms`);
  console.log('------------------------------------------------------');
  console.log(`📦 Final ZIP File : dist/${zipName}`);
  console.log(`📊 Size           : ${zipSize.toLocaleString()} bytes (${(zipSize / 1024).toFixed(2)} KB)`);
  console.log(`🎯 JS13k Limit    : ${JS13K_LIMIT_BYTES.toLocaleString()} bytes (13 KB)`);
  console.log(`📈 Limit Usage    : ${percentUsed}% (${remainingBytes.toLocaleString()} bytes remaining)`);
  console.log('------------------------------------------------------');
  if (zipSize <= JS13K_LIMIT_BYTES) {
    console.log(`✅ SUCCESS: Build is ${(remainingBytes).toLocaleString()} bytes UNDER the JS13k limit!`);
  } else {
    console.warn(`⚠️ WARNING: Build EXCEEDS JS13k limit by ${(zipSize - JS13K_LIMIT_BYTES).toLocaleString()} bytes!`);
  }
  console.log('======================================================\n');
}

build().catch((err) => {
  console.error('❌ Build failed:', err);
  process.exit(1);
});
