// images/ 폴더와 images.json을 동기화한다.
// 기존 순서와 캡션은 유지하고, 새 파일은 뒤에 추가, 사라진 파일은 제거.
import { readdirSync, readFileSync, writeFileSync, existsSync, statSync } from "node:fs";
import { join, dirname, parse } from "node:path";
import { fileURLToPath } from "node:url";
import { homedir } from "node:os";

export const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
// IMAGES_DIR 환경변수로 외부 폴더(예: ~/Desktop/green stuff)를 직접 쓸 수 있음
export const IMAGES_DIR = process.env.IMAGES_DIR
  ? process.env.IMAGES_DIR.replace(/^~(?=\/)/, homedir())
  : join(ROOT, "images");
const MANIFEST = join(ROOT, "images.json");
const EXT = /\.(png|jpe?g|webp|gif|avif)$/i;

export function syncManifest() {
  const files = readdirSync(IMAGES_DIR).filter((f) => EXT.test(f) && !f.startsWith("."));
  let prev = [];
  try { prev = JSON.parse(readFileSync(MANIFEST, "utf8")); } catch {}

  const kept = prev.filter((e) => files.includes(e.file));
  const added = files
    .filter((f) => !kept.some((e) => e.file === f))
    .sort()
    .map((f) => ({ file: f, caption: parse(f).name }));
  const next = [...kept, ...added];

  if (added.length || kept.length !== prev.length || !existsSync(MANIFEST)) {
    writeFileSync(MANIFEST, JSON.stringify(next, null, 2) + "\n");
  }
  // mtime은 캐시 무효화용 (PS로 덮어써도 새 이미지를 받게)
  return {
    list: next.map((e) => ({ ...e, v: Math.round(statSync(join(IMAGES_DIR, e.file)).mtimeMs) })),
    added: added.length,
    removed: prev.length - kept.length,
  };
}
