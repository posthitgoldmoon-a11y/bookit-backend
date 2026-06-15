const fs = require('fs');
const file = '/home/ubuntu/bookit-backend/src/routes/webhook.js';
let code = fs.readFileSync(file, 'utf8');

const oldDoctorsKo = `  const doctors = {
    ko: [
      { name: '김연세 원장', spec: '피부과 전문의\\n경력 20년\\n레이저 시술 전문', btn: '김연세 원장으로 예약하기' },
      { name: '박푸르미 원장', spec: '피부과 전문의\\n경력 15년\\n보톡스·필러 전문', btn: '박푸르미 원장으로 예약하기' },
      { name: '이미소 원장', spec: '피부과 전문의\\n경력 10년\\n피부 관리 전문', btn: '이미소 원장으로 예약하기' }
    ],`;

const newDoctorsKo = `  const BASE_URL2 = process.env.BASE_URL || 'https://your-server.com';
  const doctors = {
    ko: [
      { name: '김연세 원장', spec: '피부과 전문의\\n경력 20년\\n레이저 시술 전문', btn: '김연세 원장으로 예약하기', img: BASE_URL2+'/doctor_1.jpg' },
      { name: '박푸르미 원장', spec: '피부과 전문의\\n경력 15년\\n보톡스·필러 전문', btn: '박푸르미 원장으로 예약하기', img: BASE_URL2+'/doctor_2.jpg' },
      { name: '이미소 원장', spec: '피부과 전문의\\n경력 10년\\n피부 관리 전문', btn: '이미소 원장으로 예약하기', img: BASE_URL2+'/doctor_3.jpg' }
    ],`;

if (code.includes(oldDoctorsKo)) {
  code = code.replace(oldDoctorsKo, newDoctorsKo);
  console.log('✅ 이미지 URL 추가 완료');
} else {
  console.log('❌ 텍스트 못 찾음');
  process.exit(1);
}

// 각 언어 의사 배열에도 img 추가
const langs = ['en', 'zh', 'ja'];
const imgNums = ['doctor_1.jpg', 'doctor_2.jpg', 'doctor_3.jpg'];

// carousel items에 thumbnail 추가
const oldItems = `      items: docList.map(d => ({
        title: d.name,
        description: d.spec,
        buttons: [{ action: 'message', label: bookLabel, messageText: d.btn }]
      }))`;

const newItems = `      items: docList.map(d => ({
        title: d.name,
        description: d.spec,
        thumbnail: d.img ? { imageUrl: d.img, fixedRatio: false } : undefined,
        buttons: [{ action: 'message', label: bookLabel, messageText: d.btn }]
      }))`;

if (code.includes(oldItems)) {
  code = code.replace(oldItems, newItems);
  console.log('✅ carousel thumbnail 추가 완료');
} else {
  console.log('❌ carousel items 텍스트 못 찾음');
}

fs.writeFileSync(file, code, 'utf8');
console.log('✅ 저장 완료');
