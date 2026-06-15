const fs = require('fs');
const file = '/home/ubuntu/bookit-backend/src/routes/webhook.js';
let code = fs.readFileSync(file, 'utf8');

// 1. sendCallback 함수 개선 - basicCard 버튼 지원 추가
const oldCallback = `async function sendCallback(callbackUrl, text, quickReplies = null) {
  const body = {
    version: "2.0",
    template: { outputs: [{ simpleText: { text } }] }
  };
  if (quickReplies) body.template.quickReplies = quickReplies;
  try {
    const res = await fetch(callbackUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body)
    });
    const resText = await res.text();
    console.log('콜백응답:', res.status, resText);
  } catch(e) { console.error('콜백오류:', e.message); }
}`;

const newCallback = `async function sendCallback(callbackUrl, text, quickReplies = null, buttons = null) {
  // buttons가 있으면 basicCard로, 없으면 simpleText로
  let outputs;
  if (buttons) {
    outputs = [{ basicCard: { title: text, buttons: buttons } }];
  } else {
    outputs = [{ simpleText: { text } }];
  }
  const body = {
    version: "2.0",
    template: { outputs }
  };
  if (quickReplies) body.template.quickReplies = quickReplies;
  try {
    const res = await fetch(callbackUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body)
    });
    const resText = await res.text();
    console.log('콜백응답:', res.status, resText);
  } catch(e) { console.error('콜백오류:', e.message); }
}`;

if (code.includes(oldCallback)) {
  code = code.replace(oldCallback, newCallback);
  console.log('✅ sendCallback 개선 완료');
} else {
  console.log('❌ sendCallback 텍스트 못 찾음');
}

// 2. 오시는길 - sendCallback 4번째 인자로 buttons 전달
const oldOsineungil = `      await sendCallback(callbackUrl,
        dirTexts[lang] || dirTexts.ko,
        [
          { label: mapLabels[lang] || mapLabels.ko, action: 'webLink', webLinkUrl: 'https://map.kakao.com/?q=강남역피부 과' },
          { label: lt.home, action: 'message', messageText: '처음으로' }
        ]
      );`;

const newOsineungil = `      await sendCallback(callbackUrl,
        dirTexts[lang] || dirTexts.ko,
        getQuickReplies(lang),
        [
          { action: 'webLink', label: mapLabels[lang] || mapLabels.ko, webLinkUrl: 'https://map.kakao.com/?q=강남역피부과' },
          { action: 'message', label: lt.home, messageText: '처음으로' }
        ]
      );`;

if (code.includes(oldOsineungil)) {
  code = code.replace(oldOsineungil, newOsineungil);
  console.log('✅ 오시는길 버튼 수정 완료');
} else {
  console.log('❌ 오시는길 텍스트 못 찾음');
  // 줄 확인
  code.split('\n').forEach((l,i) => { if(l.includes('map.kakao.com')) console.log(i+1, l); });
}

// 3. BASE_URL2 → BASE_URL 로 수정
code = code.replace(
  `const BASE_URL2 = process.env.BASE_URL || 'https://your-server.com';`,
  ``
);
code = code.replaceAll(`BASE_URL2+'/doctor_`, `BASE_URL+'/doctor_`);
console.log('✅ BASE_URL2 → BASE_URL 수정 완료');

fs.writeFileSync(file, code, 'utf8');
console.log('✅ 저장 완료');
