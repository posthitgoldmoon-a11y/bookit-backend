const fs = require('fs');
const file = '/home/ubuntu/bookit-backend/src/routes/webhook.js';
let code = fs.readFileSync(file, 'utf8');

// 1. showDoctors lang 전달
code = code.replace(
  "if (geminiReply.showDoctors) { await showDoctors(callbackUrl, geminiReply.message); return; }",
  "if (geminiReply.showDoctors) { await showDoctors(callbackUrl, session.data.lang || 'ko'); return; }"
);
console.log('✅ showDoctors lang 수정');

// 2. showCalendar lang 전달
code = code.replace(
  "if (geminiReply.showCalendar) { await sendBookingMenu(callbackUrl, kakaoUserId); return; }",
  "if (geminiReply.showCalendar) { await sendBookingMenu(callbackUrl, kakaoUserId, session.data.lang || 'ko'); return; }"
);
console.log('✅ showCalendar lang 수정');

// 3. showBookingType - mainQuickReplies → getQuickReplies(lang)
code = code.replace(
  "if (geminiReply.showBookingType) {\n      await sendCallback(callbackUrl, geminiReply.message, mainQuickReplies);\n      return;\n    }",
  "if (geminiReply.showBookingType) {\n      await sendCallback(callbackUrl, geminiReply.message, getQuickReplies(session.data.lang || 'ko'));\n      return;\n    }"
);
console.log('✅ showBookingType lang 수정');

fs.writeFileSync(file, code, 'utf8');
console.log('✅ 전체 저장 완료');
