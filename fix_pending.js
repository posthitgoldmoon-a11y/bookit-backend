const fs = require('fs');
const file = '/home/ubuntu/bookit-backend/src/routes/webhook.js';
let content = fs.readFileSync(file, 'utf8');

const oldBlock = `    if (userMessage === "예약하기" || userMessage === "상담하기") {
      session.data.pendingMenu = userMessage;
      await fetch(callbackUrl, {`;

const newBlock = `    if (userMessage === "예약하기" || userMessage === "상담하기") {
      session.data.pendingMenu = userMessage;
      // 언어가 이미 선택된 경우 바로 메뉴로
      if (session.data.lang) {
        if (userMessage === "상담하기") {
          await sendConsultMenu(callbackUrl, session.data.lang);
        } else {
          await sendBookingMenu(callbackUrl, kakaoUserId, session.data.lang);
        }
        return;
      }
      await fetch(callbackUrl, {`;

if (content.includes(oldBlock)) {
  content = content.replace(oldBlock, newBlock);
  fs.writeFileSync(file, content, 'utf8');
  console.log('✅ 완료');
} else {
  console.log('❌ 텍스트를 찾지 못함');
}
