// 개발 서버: 정적 파일 + images/ 폴더 감시 → 브라우저에 실시간 반영 (의존성 없음)
// usage: node server.mjs  →  http://localhost:5173
import { createServer } from "node:http";
import { readFile, stat } from "node:fs/promises";
import { watch } from "node:fs";
import { join, extname, normalize } from "node:path";
import { ROOT, IMAGES_DIR, syncManifest } from "./scripts/manifest.mjs";

const PORT = Number(process.env.PORT) || 5173;
const MIME = {
  ".html": "text/html; charset=utf-8",
  ".js": "text/javascript", ".mjs": "text/javascript",
  ".css": "text/css", ".json": "application/json",
  ".png": "image/png", ".jpg": "image/jpeg", ".jpeg": "image/jpeg",
  ".webp": "image/webp", ".gif": "image/gif", ".avif": "image/avif", ".svg": "image/svg+xml",
};

const clients = new Set();

createServer(async (req, res) => {
  const url = new URL(req.url, "http://x");

  if (url.pathname === "/api/images") {
    res.writeHead(200, { "Content-Type": MIME[".json"], "Cache-Control": "no-store" });
    return res.end(JSON.stringify(syncManifest().list));
  }

  if (url.pathname === "/events") {
    res.writeHead(200, { "Content-Type": "text/event-stream", "Cache-Control": "no-store", Connection: "keep-alive" });
    res.write("retry: 1000\n\n");
    clients.add(res);
    req.on("close", () => clients.delete(res));
    return;
  }

  const pathname = decodeURIComponent(url.pathname === "/" ? "/index.html" : url.pathname);
  // /images/* 는 IMAGES_DIR(외부 폴더일 수 있음)에서, 나머지는 프로젝트 루트에서
  const base = pathname.startsWith("/images/") ? IMAGES_DIR : ROOT;
  const path = normalize(join(base, base === ROOT ? pathname : pathname.slice("/images/".length)));
  if (!path.startsWith(base)) { res.writeHead(403); return res.end(); }
  try {
    if (!(await stat(path)).isFile()) throw 0;
    res.writeHead(200, { "Content-Type": MIME[extname(path).toLowerCase()] || "application/octet-stream", "Cache-Control": "no-store" });
    res.end(await readFile(path));
  } catch {
    res.writeHead(404); res.end("not found");
  }
}).listen(PORT, () => console.log(`http://localhost:${PORT}  (watching ${IMAGES_DIR})`));

// PS 저장은 임시파일 쓰기→rename 등 이벤트가 연달아 오므로 debounce
let timer;
function notify() {
  clearTimeout(timer);
  timer = setTimeout(() => {
    const { list, added, removed } = syncManifest();
    console.log(`images changed: ${list.length} images (+${added}, -${removed})`);
    for (const c of clients) c.write(`data: images\n\n`);
  }, 300);
}
watch(IMAGES_DIR, notify);
watch(join(ROOT, "images.json"), notify);
