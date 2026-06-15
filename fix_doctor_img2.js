const fs = require('fs');
const file = '/home/ubuntu/bookit-backend/src/routes/webhook.js';
let code = fs.readFileSync(file, 'utf8');

// en 의사 배열에 img 추가
code = code.replace(
  `{ name: 'Dr. Kim Yonsei', spec: 'Dermatologist\\n20 years experience\\nLaser treatment specialist', btn: '김연세 원 장으로 예약하기' }`,
  `{ name: 'Dr. Kim Yonsei', spec: 'Dermatologist\\n20 years experience\\nLaser treatment specialist', btn: '김연세 원장으로 예약하기', img: BASE_URL2+'/doctor_1.jpg' }`
);
code = code.replace(
  `{ name: 'Dr. Park Purumi', spec: 'Dermatologist\\n15 years experience\\nBotox & Filler specialist', btn: '박푸르미  원장으로 예약하기' }`,
  `{ name: 'Dr. Park Purumi', spec: 'Dermatologist\\n15 years experience\\nBotox & Filler specialist', btn: '박푸르미 원장으로 예약하기', img: BASE_URL2+'/doctor_2.jpg' }`
);
code = code.replace(
  `{ name: 'Dr. Lee Miso', spec: 'Dermatologist\\n10 years experience\\nSkin care specialist', btn: '이미소 원장으로 예약하기' }`,
  `{ name: 'Dr. Lee Miso', spec: 'Dermatologist\\n10 years experience\\nSkin care specialist', btn: '이미소 원장으로 예약하기', img: BASE_URL2+'/doctor_3.jpg' }`
);

fs.writeFileSync(file, code, 'utf8');
console.log('✅ 영어 의사 이미지 추가 완료');

// 중국어/일본어 img 확인
const lines = code.split('\n');
lines.forEach((l, i) => {
  if ((l.includes('金延世') || l.includes('キム')) && !l.includes('img:')) {
    console.log('⚠️ img 없는 줄:', i+1, l.trim());
  }
});
