const fs = require('fs');
const file = '/home/ubuntu/bookit-backend/src/routes/webhook.js';
let code = fs.readFileSync(file, 'utf8');

const oldBookingType = `    if (geminiReply.showBookingType) {
      await sendCallback(callbackUrl, geminiReply.message, getQuickReplies(session.data.lang || 'ko'));
      return;
    }`;

const newBookingType = `    if (geminiReply.showBookingType) {
      const lang = session.data.lang || 'ko';
      const bl = bookingTypeLabels[lang] || bookingTypeLabels.ko;
      await fetch(callbackUrl, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          version: "2.0",
          template: {
            outputs: [{
              basicCard: {
                title: bl.title,
                description: bl.desc,
                buttons: [
                  { action: "webLink", label: bl.naver, webLinkUrl: process.env.NAVER_BOOKING_URL || "https://booking.naver.com" },
                  { action: "message", label: bl.kakao, messageText: "카카오예약하기" }
                ]
              }
            }]
          }
        })
      });
      return;
    }`;

code = code.replace(oldBookingType, newBookingType);
fs.writeFileSync(file, code, 'utf8');
console.log('✅ showBookingType 네이버/카카오 카드로 수정 완료');
