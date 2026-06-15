const fs = require('fs');
const file = '/home/ubuntu/bookit-backend/src/routes/webhook.js';
let code = fs.readFileSync(file, 'utf8');

const oldHours = `      await sendCallback(callbackUrl, hoursTexts[lang] || hoursTexts.ko,
        [{ label: lt.home, action: "message", messageText: "처음으로" }]
      );`;

const newHours = `      await sendCallback(callbackUrl, hoursTexts[lang] || hoursTexts.ko,
        getQuickReplies(lang),
        [{ action: "message", label: lt.home, messageText: "처음으로" }]
      );`;

if (code.includes(oldHours)) {
  code = code.replace(oldHours, newHours);
  fs.writeFileSync(file, code, 'utf8');
  console.log('✅ 진료시간 버튼 수정 완료');
} else {
  console.log('❌ 텍스트 못 찾음');
}
