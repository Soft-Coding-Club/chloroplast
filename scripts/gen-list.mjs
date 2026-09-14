// images/ 폴더를 스캔해서 images.json을 갱신한다 (서버 없이 정적으로 쓸 때용).
// usage: node scripts/gen-list.mjs
import { syncManifest } from "./manifest.mjs";

const { list, added, removed } = syncManifest();
console.log(`images.json: ${list.length} images (+${added}, -${removed})`);
