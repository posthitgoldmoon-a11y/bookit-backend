const fs = require('fs');
const file = '/home/ubuntu/bookit-backend/src/routes/webhook.js';
let lines = fs.readFileSync(file, 'utf8').split('\n');

for (let i = 0; i < lines.length; i++) {
  if (lines[i].includes('await sendCallback(callbackUrl, ltErr.error);')) {
    lines[i] = `    try { await sendCallback(callbackUrl, ltErr.error); } catch(e2) { console.error('❌ 콜백 응답도 실패:', e2.message); }`;
    console.log('✅ 안전 처리 완료, 줄:', i+1);
    break;
  }
}

fs.writeFileSync(file, lines.join('\n'), 'utf8');
