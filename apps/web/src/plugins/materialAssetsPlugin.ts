import type { Plugin } from 'vite';
import fs from 'node:fs';
import path from 'node:path';

const MIME: Record<string, string> = {
  '.mp3': 'audio/mpeg',
  '.webp': 'image/webp',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
};

function copyDir(src: string, dest: string) {
  if (!fs.existsSync(src)) return;
  fs.mkdirSync(dest, { recursive: true });
  for (const entry of fs.readdirSync(src, { withFileTypes: true })) {
    const srcPath = path.join(src, entry.name);
    const destPath = path.join(dest, entry.name);
    if (entry.isDirectory()) {
      copyDir(srcPath, destPath);
    } else {
      fs.copyFileSync(srcPath, destPath);
    }
  }
}

export function materialAssetsPlugin(materialDir: string): Plugin {
  return {
    name: 'material-assets',
    configureServer(server) {
      server.middlewares.use('/material', (req, res, next) => {
        const raw = req.url ?? '/';
        const urlPath = decodeURIComponent(raw.split('?')[0] ?? '/');
        const rel = urlPath.replace(/^\/+/, '');
        const filePath = path.normalize(path.join(materialDir, rel));
        if (!filePath.startsWith(path.normalize(materialDir))) {
          next();
          return;
        }
        if (!fs.existsSync(filePath) || !fs.statSync(filePath).isFile()) {
          next();
          return;
        }
        const ext = path.extname(filePath).toLowerCase();
        res.setHeader('Content-Type', MIME[ext] ?? 'application/octet-stream');
        fs.createReadStream(filePath).pipe(res);
      });
    },
    closeBundle() {
      const outDir = path.resolve(process.cwd(), 'dist');
      copyDir(materialDir, path.join(outDir, 'material'));
    },
  };
}
