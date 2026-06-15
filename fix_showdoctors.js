const fs = require('fs');
const file = '/home/ubuntu/bookit-backend/src/routes/webhook.js';
let lines = fs.readFileSync(file, 'utf8').split('\n');

// showDoctors 함수 시작/끝 찾기
let startIdx = -1, endIdx = -1;
for (let i = 0; i < lines.length; i++) {
  if (lines[i].includes('async function showDoctors')) {
    startIdx = i;
    break;
  }
}

if (startIdx === -1) { console.log('❌ 함수 못 찾음'); process.exit(1); }

// 함수 끝 찾기 (빈줄 다음 async function 또는 파일 끝)
let braceCount = 0, started = false;
for (let i = startIdx; i < lines.length; i++) {
  for (const ch of lines[i]) {
    if (ch === '{') { braceCount++; started = true; }
    if (ch === '}') braceCount--;
  }
  if (started && braceCount === 0) { endIdx = i; break; }
}

console.log(`showDoctors: ${startIdx+1}~${endIdx+1}줄`);

const newFunc = [
  "async function showDoctors(callbackUrl, lang) {",
  "  lang = lang || 'ko';",
  "  const doctorLang = lang;",
  "  const titles = {",
  "    ko: '👨‍⚕️ 의료진 소개', en: '👨‍⚕️ Our Doctors', zh: '👨‍⚕️ 医师介绍',",
  "    ja: '👨‍⚕️ 医師紹介', th: '👨‍⚕️ แพทย์ของเรา', vi: '👨‍⚕️ Bác sĩ của chúng tôi',",
  "    ar: '👨‍⚕️ أطباؤنا', ru: '👨‍⚕️ Наши врачи', fr: '👨‍⚕️ Nos médecins', es: '👨‍⚕️ Nuestros médicos'",
  "  };",
  "  const doctors = {",
  "    ko: [",
  "      { name: '김연세 원장', spec: '피부과 전문의\\n경력 20년\\n레이저 시술 전문', btn: '김연세 원장으로 예약하기' },",
  "      { name: '박푸르미 원장', spec: '피부과 전문의\\n경력 15년\\n보톡스·필러 전문', btn: '박푸르미 원장으로 예약하기' },",
  "      { name: '이미소 원장', spec: '피부과 전문의\\n경력 10년\\n피부 관리 전문', btn: '이미소 원장으로 예약하기' }",
  "    ],",
  "    en: [",
  "      { name: 'Dr. Kim Yonsei', spec: 'Dermatologist\\n20 years experience\\nLaser treatment specialist', btn: '김연세 원장으로 예약하기' },",
  "      { name: 'Dr. Park Purumi', spec: 'Dermatologist\\n15 years experience\\nBotox & Filler specialist', btn: '박푸르미 원장으로 예약하기' },",
  "      { name: 'Dr. Lee Miso', spec: 'Dermatologist\\n10 years experience\\nSkin care specialist', btn: '이미소 원장으로 예약하기' }",
  "    ],",
  "    zh: [",
  "      { name: '金延世院长', spec: '皮肤科专科医师\\n20年经验\\n激光治疗专家', btn: '김연세 원장으로 예약하기' },",
  "      { name: '朴普鲁美院长', spec: '皮肤科专科医师\\n15年经验\\n肉毒杆菌·填充专家', btn: '박푸르미 원장으로 예약하기' },",
  "      { name: '李美笑院长', spec: '皮肤科专科医师\\n10年经验\\n皮肤护理专家', btn: '이미소 원장으로 예약하기' }",
  "    ],",
  "    ja: [",
  "      { name: 'キム・ヨンセ院長', spec: '皮膚科専門医\\n経歴20年\\nレーザー治療専門', btn: '김연세 원장으로 예약하기' },",
  "      { name: 'パク・プルミ院長', spec: '皮膚科専門医\\n経歴15年\\nボトックス・フィラー専門', btn: '박푸르미 원장으로 예약하기' },",
  "      { name: 'イ・ミソ院長', spec: '皮膚科専門医\\n経歴10年\\nスキンケア専門', btn: '이미소 원장으로 예약하기' }",
  "    ]",
  "  };",
  "  const bookBtnLabels = {",
  "    ko: '📅 예약하기', en: '📅 Book', zh: '📅 预约', ja: '📅 予約する',",
  "    th: '📅 จอง', vi: '📅 Đặt lịch', ar: '📅 حجز', ru: '📅 Записаться', fr: '📅 Réserver', es: '📅 Reservar'",
  "  };",
  "  const docList = doctors[lang] || doctors.en;",
  "  const bookLabel = bookBtnLabels[lang] || bookBtnLabels.en;",
  "  const outputs = [",
  "    { simpleText: { text: titles[lang] || titles.en } },",
  "    { carousel: {",
  "      type: 'basicCard',",
  "      items: docList.map(d => ({",
  "        title: d.name,",
  "        description: d.spec,",
  "        buttons: [{ action: 'message', label: bookLabel, messageText: d.btn }]",
  "      }))",
  "    }}",
  "  ];",
  "  try {",
  "    const res = await fetch(callbackUrl, {",
  "      method: 'POST',",
  "      headers: { 'Content-Type': 'application/json' },",
  "      body: JSON.stringify({",
  "        version: '2.0',",
  "        template: {",
  "          outputs,",
  "          quickReplies: getQuickReplies(doctorLang)",
  "        }",
  "      })",
  "    });",
  "    const resText = await res.text();",
  "    console.log('showDoctors 응답:', res.status, resText);",
  "  } catch(e) {",
  "    console.error('showDoctors 오류:', e.message);",
  "  }",
  "}"
];

lines.splice(startIdx, endIdx - startIdx + 1, ...newFunc);
fs.writeFileSync(file, lines.join('\n'), 'utf8');
console.log('✅ showDoctors 다국어 완료');
