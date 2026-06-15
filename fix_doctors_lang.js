const fs = require('fs');
const file = '/home/ubuntu/bookit-backend/src/routes/webhook.js';
let lines = fs.readFileSync(file, 'utf8').split('\n');

// 1. 의료진보기 → showDoctors에 lang 전달
for (let i = 0; i < lines.length; i++) {
  if (lines[i].includes("userMessage === '의료진보기'")) {
    // 다음 줄에 showDoctors 호출이 있음
    if (lines[i+1] && lines[i+1].includes('showDoctors(callbackUrl, null)')) {
      lines[i+1] = lines[i+1].replace(
        'showDoctors(callbackUrl, null)',
        'showDoctors(callbackUrl, session.data.lang || \'ko\')'
      );
      console.log('✅ 의료진보기 lang 전달 완료');
    }
    break;
  }
}

// 2. 807번 줄 고정 한국어 quickReplies 교체 (index 806)
// 795~810 범위에서 고정 예약하기/처음으로 quickReplies 찾기
let fixedIdx = -1;
for (let i = 800; i < 815; i++) {
  if (lines[i] && lines[i].includes('"📅 예약하기"') && lines[i].includes('"예약하기"')) {
    fixedIdx = i - 1; // quickReplies: [ 줄
    break;
  }
}

if (fixedIdx >= 0) {
  // quickReplies 블록 전체 교체 (4줄: quickReplies: [, 예약하기, 처음으로, ])
  lines.splice(fixedIdx, 5,
    '          quickReplies: getQuickReplies(doctorLang)'
  );
  // doctorLang 변수를 함수 상단에서 가져오기 위해 showDoctors 함수 찾기
  console.log('✅ showDoctors quickReplies 교체 완료, fixedIdx:', fixedIdx+1);
} else {
  console.log('❌ quickReplies 고정 블록 못 찾음');
}

fs.writeFileSync(file, lines.join('\n'), 'utf8');
