const fs = require('fs');
const file = '/home/ubuntu/bookit-backend/src/routes/webhook.js';
let lines = fs.readFileSync(file, 'utf8').split('\n');

let count = 0;
const imgMap = {
  1: "BASE_URL2+'/doctor_1.jpg'",
  2: "BASE_URL2+'/doctor_2.jpg'",
  3: "BASE_URL2+'/doctor_3.jpg'"
};

// 각 언어별 의사 이름 키워드
const doctorKeywords = [
  '金延世院长', '朴普鲁美院长', '李美笑院长',
  'キム・ヨンセ院長', 'パク・プルミ院長', 'イ・ミソ院長'
];

for (let i = 0; i < lines.length; i++) {
  const line = lines[i];
  const matchedIdx = doctorKeywords.findIndex(k => line.includes(k));
  if (matchedIdx >= 0 && !line.includes('img:')) {
    const imgNum = (matchedIdx % 3) + 1;
    // btn: '...' } 앞에 img 추가
    lines[i] = line.replace(
      /,\s*btn:\s*('김연세 원장으로 예약하기'|'박푸르미 원장으로 예약하기'|'이미소 원장으로 예약하기')\s*}/,
      `, btn: $1, img: ${imgMap[imgNum]} }`
    );
    console.log(`✅ 이미지 추가: 줄 ${i+1} - ${doctorKeywords[matchedIdx]}`);
    count++;
  }
}

fs.writeFileSync(file, lines.join('\n'), 'utf8');
console.log(`✅ 총 ${count}개 이미지 추가 완료`);
