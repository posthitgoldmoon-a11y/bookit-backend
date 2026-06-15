const fs = require('fs');
const file = '/home/ubuntu/bookit-backend/src/routes/webhook.js';
let lines = fs.readFileSync(file, 'utf8').split('\n');

// 847번(index 846)의 구버전 showDoctors 찾아서 끝까지 삭제
let startIdx = -1, endIdx = -1;
for (let i = 845; i < 860; i++) {
  if (lines[i] && lines[i].includes('async function showDoctors(callbackUrl, message)')) {
    startIdx = i;
    break;
  }
}

if (startIdx === -1) { console.log('❌ 구버전 못 찾음'); process.exit(1); }

let braceCount = 0, started = false;
for (let i = startIdx; i < lines.length; i++) {
  for (const ch of lines[i]) {
    if (ch === '{') { braceCount++; started = true; }
    if (ch === '}') braceCount--;
  }
  if (started && braceCount === 0) { endIdx = i; break; }
}

console.log(`구버전 showDoctors: ${startIdx+1}~${endIdx+1}줄 삭제`);
lines.splice(startIdx, endIdx - startIdx + 1);
fs.writeFileSync(file, lines.join('\n'), 'utf8');
console.log('✅ 구버전 삭제 완료');
