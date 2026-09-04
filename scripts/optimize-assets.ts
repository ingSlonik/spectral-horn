import { execFileSync, execSync } from 'node:child_process';
import * as fs from 'node:fs';
import * as path from 'node:path';
import ect from 'ect-bin';

interface AssetSpec {
  input: string;
  output: string;
  expectedWidth: number;
  expectedHeight: number;
  maxSizeBytes: number;
  dither: string;
}

const SPECS: AssetSpec[] = [
  {
    input: 'assets/cover-original.png',
    output: 'assets/cover.png',
    expectedWidth: 800,
    expectedHeight: 500,
    maxSizeBytes: 256 * 1024, // 256 KB = 262,144 B
    dither: 'atkinson',
  },
  {
    input: 'assets/thumbnail-original.png',
    output: 'assets/thumbnail.png',
    expectedWidth: 320,
    expectedHeight: 320,
    maxSizeBytes: 64 * 1024, // 64 KB = 65,536 B
    dither: 'atkinson',
  },
];

async function optimizeAssets() {
  console.log('🎨 Optimizing contest assets for js13kGames requirements...\n');

  const tmpDir = path.resolve('.tmp-optimize-assets');
  if (!fs.existsSync(tmpDir)) {
    fs.mkdirSync(tmpDir, { recursive: true });
  }

  for (const spec of SPECS) {
    const inputPath = path.resolve(spec.input);
    if (!fs.existsSync(inputPath)) {
      console.error(`❌ Input file not found: ${spec.input}`);
      continue;
    }

    const originalSize = fs.statSync(inputPath).size;
    const baseName = path.basename(spec.input, '.png');
    const backupPath = path.join(tmpDir, `${baseName}-original.png`);
    fs.copyFileSync(inputPath, backupPath);

    const palPath = path.join(tmpDir, `${baseName}-pal.png`);
    const tempOutPath = path.join(tmpDir, `${baseName}-opt.png`);

    console.log(`🖼️  Processing ${spec.input}:`);
    console.log(`   Original size: ${(originalSize / 1024).toFixed(2)} KB (${originalSize.toLocaleString()} bytes)`);

    // 1. Generate optimal 256-color palette (no reserved transparency)
    execSync(
      `ffmpeg -y -i "${backupPath}" -vf "palettegen=max_colors=256:reserve_transparent=0" "${palPath}" 2>/dev/null`
    );

    // 2. Apply palette with chosen dither (Atkinson preserves smooth gradients while avoiding speckled noise)
    execSync(
      `ffmpeg -y -i "${backupPath}" -i "${palPath}" -lavfi "paletteuse=dither=${spec.dither}" "${tempOutPath}" 2>/dev/null`
    );

    // 3. Losslessly crush PNG container with ECT (-9, -strip)
    execFileSync(ect, ['-9', '-strip', tempOutPath], { stdio: 'pipe' });

    // 4. Verify resolution & dimensions
    const fileInfo = execSync(`sips -g pixelWidth -g pixelHeight "${tempOutPath}"`).toString();
    const widthMatch = fileInfo.match(/pixelWidth:\s*(\d+)/);
    const heightMatch = fileInfo.match(/pixelHeight:\s*(\d+)/);
    const width = widthMatch ? parseInt(widthMatch[1], 10) : 0;
    const height = heightMatch ? parseInt(heightMatch[1], 10) : 0;

    const optSize = fs.statSync(tempOutPath).size;
    const pct = ((optSize / spec.maxSizeBytes) * 100).toFixed(1);

    console.log(`   Optimized size: ${(optSize / 1024).toFixed(2)} KB (${optSize.toLocaleString()} bytes) [${pct}% of limit]`);
    console.log(`   Dimensions: ${width} × ${height} px (Expected: ${spec.expectedWidth} × ${spec.expectedHeight} px)`);

    if (width !== spec.expectedWidth || height !== spec.expectedHeight) {
      throw new Error(`Dimension mismatch for ${spec.input}! Got ${width}x${height}, expected ${spec.expectedWidth}x${spec.expectedHeight}`);
    }

    if (optSize > spec.maxSizeBytes) {
      throw new Error(`Size exceeds limit for ${spec.input}! Got ${optSize} B, limit is ${spec.maxSizeBytes} B`);
    }

    // Write back to target
    fs.copyFileSync(tempOutPath, path.resolve(spec.output));
    console.log(`   ✅ Successfully written to ${spec.output}\n`);
  }

  // Cleanup tmp dir
  fs.rmSync(tmpDir, { recursive: true, force: true });
  console.log('🎉 All assets successfully optimized and verified!');
}

optimizeAssets().catch((err) => {
  console.error('Error optimizing assets:', err);
  process.exit(1);
});
