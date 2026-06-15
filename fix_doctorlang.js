const fs = require('fs');
const file = '/home/ubuntu/bookit-backend/src/routes/webhook.js';
let code = fs.readFileSync(file, 'utf8');

// doctorLang 변수 선언 수정 - lang을 받아서 doctorLang에 할당
const oldHead = `async function showDoctors(callbackUrl, lang) {
  lang = lang || 'ko';
  const doctorLang = lang;`;

const newHead = `async function showDoctors(callbackUrl, lang) {
  const doctorLang = lang || 'ko';`;

if (code.includes(oldHead)) {
  code = code.replace(oldHead, newHead);
  fs.writeFileSync(file, code, 'utf8');
  console.log('✅ showDoctors 수정 완료');
} else {
  // 줄별로 확인
  const lines = code.split('\n');
  lines.forEach((l, i) => {
    if (l.includes('showDoctors') || l.includes('doctorLang')) console.log(i+1, l);
  });
  console.log('❌ 텍스트 못 찾음');
}
