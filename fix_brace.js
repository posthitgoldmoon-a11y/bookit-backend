const fs = require('fs');
const file = '/home/ubuntu/bookit-backend/src/routes/webhook.js';
let lines = fs.readFileSync(file, 'utf8').split('\n');

// quickReplies: getQuickReplies(doctorLang) 다음에 } 추가
for (let i = 0; i < lines.length; i++) {
  if (lines[i].includes('quickReplies: getQuickReplies(doctorLang)')) {
    // 다음 줄이 }) 인지 확인
    if (lines[i+1] && lines[i+1].trim() === '})') {
      lines.splice(i+1, 0, '        }');
      console.log('✅ 중괄호 추가 완료, 줄:', i+2);
      break;
    }
  }
}

fs.writeFileSync(file, lines.join('\n'), 'utf8');
