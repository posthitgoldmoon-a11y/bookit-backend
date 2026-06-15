const fs = require('fs');
const file = '/home/ubuntu/bookit-backend/src/routes/webhook.js';
let lines = fs.readFileSync(file, 'utf8').split('\n');

// sendPriceMenu 함수 시작/끝 찾기
let startIdx = -1, endIdx = -1;
for (let i = 0; i < lines.length; i++) {
  if (lines[i].includes('async function sendPriceMenu')) {
    startIdx = i;
    break;
  }
}
if (startIdx === -1) { console.log('❌ 함수 못 찾음'); process.exit(1); }

let braceCount = 0, started = false;
for (let i = startIdx; i < lines.length; i++) {
  for (const ch of lines[i]) {
    if (ch === '{') { braceCount++; started = true; }
    if (ch === '}') braceCount--;
  }
  if (started && braceCount === 0) { endIdx = i; break; }
}
console.log(`sendPriceMenu: ${startIdx+1}~${endIdx+1}줄`);

const newFunc = [
  "async function sendPriceMenu(callbackUrl, lang) {",
  "  lang = lang || 'ko';",
  "  console.log('sendPriceMenu 시작, 언어:', lang);",
  "  const lt = LANG_TEXTS[lang] || LANG_TEXTS.ko;",
  "  const titles = {",
  "    ko: '💰 시술 가격 안내', en: '💰 Treatment Prices', zh: '💰 治疗价格',",
  "    ja: '💰 施術料金案内', th: '💰 ราคาการรักษา', vi: '💰 Bảng giá dịch vụ',",
  "    ar: '💰 أسعار العلاجات', ru: '💰 Цены на процедуры', fr: '💰 Tarifs des soins', es: '💰 Precios de tratamientos'",
  "  };",
  "  const items = {",
  "    ko: [",
  "      { title: '✨ 레이저 토닝', desc: '기미·잡티·모공 개선\\n1회: 150,000원\\n5회 패키지: 650,000원' },",
  "      { title: '💉 보톡스', desc: '이마·눈가·팔자주름\\n1부위: 100,000원\\n3부위: 250,000원' },",
  "      { title: '💧 수분 리프팅', desc: '피부 탄력·수분 개선\\n1회: 200,000원\\n3회 패키지: 550,000원' },",
  "      { title: '🌿 피부 클리닉', desc: '여드름·피부트러블 케어\\n1회: 80,000원\\n5회 패키지: 350,000원' }",
  "    ],",
  "    en: [",
  "      { title: '✨ Laser Toning', desc: 'Pigmentation & Pore Care\\n1 session: ₩150,000\\n5 sessions: ₩650,000' },",
  "      { title: '💉 Botox', desc: 'Forehead, Eyes, Nasolabial\\n1 area: ₩100,000\\n3 areas: ₩250,000' },",
  "      { title: '💧 Moisture Lifting', desc: 'Elasticity & Hydration\\n1 session: ₩200,000\\n3 sessions: ₩550,000' },",
  "      { title: '🌿 Skin Clinic', desc: 'Acne & Skin Care\\n1 session: ₩80,000\\n5 sessions: ₩350,000' }",
  "    ],",
  "    zh: [",
  "      { title: '✨ 激光嫩肤', desc: '改善色斑·毛孔\\n1次: ₩150,000\\n5次套餐: ₩650,000' },",
  "      { title: '💉 肉毒杆菌', desc: '额头·眼角·法令纹\\n1个部位: ₩100,000\\n3个部位: ₩250,000' },",
  "      { title: '💧 水光针', desc: '改善弹力·保湿\\n1次: ₩200,000\\n3次套餐: ₩550,000' },",
  "      { title: '🌿 皮肤诊所', desc: '痤疮·皮肤问题护理\\n1次: ₩80,000\\n5次套餐: ₩350,000' }",
  "    ],",
  "    ja: [",
  "      { title: '✨ レーザートーニング', desc: 'シミ・毛穴ケア\\n1回: ₩150,000\\n5回パック: ₩650,000' },",
  "      { title: '💉 ボトックス', desc: 'おでこ・目元・ほうれい線\\n1部位: ₩100,000\\n3部位: ₩250,000' },",
  "      { title: '💧 水分リフティング', desc: '弾力・保湿改善\\n1回: ₩200,000\\n3回パック: ₩550,000' },",
  "      { title: '🌿 スキンクリニック', desc: 'ニキビ・肌荒れケア\\n1回: ₩80,000\\n5回パック: ₩350,000' }",
  "    ]",
  "  };",
  "  const bookLabels = {",
  "    ko: '📅 예약하기', en: '📅 Book Now', zh: '📅 立即预约',",
  "    ja: '📅 予約する', th: '📅 จองเลย', vi: '📅 Đặt ngay',",
  "    ar: '📅 احجز الآن', ru: '📅 Записаться', fr: '📅 Réserver', es: '📅 Reservar'",
  "  };",
  "  const bookMsgs = {",
  "    ko: '예약하기', en: '예약하기', zh: '예약하기', ja: '예약하기',",
  "    th: '예약하기', vi: '예약하기', ar: '예약하기', ru: '예약하기', fr: '예약하기', es: '예약하기'",
  "  };",
  "  const priceItems = items[lang] || items.en;",
  "  const bookLabel = bookLabels[lang] || bookLabels.en;",
  "  try {",
  "    const res = await fetch(callbackUrl, {",
  "      method: 'POST',",
  "      headers: { 'Content-Type': 'application/json' },",
  "      body: JSON.stringify({",
  "        version: '2.0',",
  "        template: {",
  "          outputs: [",
  "            { simpleText: { text: titles[lang] || titles.en } },",
  "            { carousel: {",
  "              type: 'basicCard',",
  "              items: priceItems.map(item => ({",
  "                title: item.title,",
  "                description: item.desc,",
  "                buttons: [{ action: 'message', label: bookLabel, messageText: '예약하기' }]",
  "              }))",
  "            }}",
  "          ],",
  "          quickReplies: getQuickReplies(lang)",
  "        }",
  "      })",
  "    });",
  "    const resText = await res.text();",
  "    console.log('sendPriceMenu 응답:', res.status, resText);",
  "  } catch(e) {",
  "    console.error('sendPriceMenu 오류:', e.message);",
  "  }",
  "}"
];

lines.splice(startIdx, endIdx - startIdx + 1, ...newFunc);
fs.writeFileSync(file, lines.join('\n'), 'utf8');
console.log('✅ sendPriceMenu 다국어 완료');
