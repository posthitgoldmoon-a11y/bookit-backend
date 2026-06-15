const fs = require('fs');
const file = '/home/ubuntu/bookit-backend/src/routes/webhook.js';
let lines = fs.readFileSync(file, 'utf8').split('\n');

// 370번째 줄(index 369)부터 오시는길 블록 찾기
let startIdx = -1;
let endIdx = -1;

for (let i = 368; i < 385; i++) {
  if (lines[i] && lines[i].includes("userMessage === '오시는길'")) {
    startIdx = i;
    break;
  }
}

if (startIdx === -1) {
  console.log('❌ 시작줄 못 찾음');
  process.exit(1);
}

// return; 이 있는 줄까지 찾기
for (let i = startIdx; i < startIdx + 15; i++) {
  if (lines[i] && lines[i].trim() === 'return;') {
    endIdx = i;
    break;
  }
}

// 닫는 } 줄까지
endIdx = endIdx + 1;

console.log(`블록: ${startIdx+1}~${endIdx+1}줄`);
console.log('기존 코드:');
lines.slice(startIdx, endIdx+1).forEach((l, i) => console.log(startIdx+i+1, l));

const newBlock = [
  "    if (userMessage === '오시는길') {",
  "      const lang = session.data.lang || 'ko';",
  "      const lt = LANG_TEXTS[lang] || LANG_TEXTS.ko;",
  "      const dirTexts = {",
  "        ko: '📍 연세푸르미피부과 오시는 길\\n\\n📌 서울 강남구 강남대로 123 푸르미빌딩 5층\\n\\n🚇 강남역 2번 출구 도보 3분\\n🚗 건물 내 주차 1시간 무료\\n📞 02-1234-5678',",
  "        en: '📍 Directions to Yonsei Purmi Dermatology\\n\\n📌 5F Purmi Bldg, 123 Gangnam-daero, Gangnam-gu, Seoul\\n\\n🚇 3 min walk from Gangnam Station Exit 2\\n🚗 1 hour free parking\\n📞 02-1234-5678',",
  "        zh: '📍 前往延世普尔美皮肤科\\n\\n📌 首尔江南区江南大路123号普尔美大厦5楼\\n\\n🚇 江南站2号出口步行3分钟\\n🚗 楼内停车1小时免费\\n📞 02-1234-5678',",
  "        ja: '📍 延世プルミ皮膚科へのアクセス\\n\\n📌 ソウル江南区江南大路123 プルミビル5階\\n\\n🚇 江南駅2番出口から徒歩3分\\n🚗 館内駐車場1時間無料\\n📞 02-1234-5678',",
  "        th: '📍 เส้นทางไป Yonsei Purmi Dermatology\\n\\n📌 ชั้น 5 Purmi Bldg, 123 Gangnam-daero, Seoul\\n\\n🚇 เดิน 3 นาทีจากทางออก 2 สถานี Gangnam\\n🚗 จอดรถฟรี 1 ชั่วโมง\\n📞 02-1234-5678',",
  "        vi: '📍 Đường đến Yonsei Purmi Dermatology\\n\\n📌 Tầng 5, Tòa nhà Purmi, 123 Gangnam-daero, Seoul\\n\\n🚇 Đi bộ 3 phút từ cửa số 2 ga Gangnam\\n🚗 Đậu xe miễn phí 1 giờ\\n📞 02-1234-5678',",
  "        ar: '📍 الاتجاهات إلى عيادة يونسي بورومي\\n\\n📌 الطابق 5، مبنى بورومي، 123 شارع غانغنام، سيول\\n\\n🚇 3 دقائق سيرًا من مخرج 2 محطة غانغنام\\n🚗 ساعة واحدة مجانية للانتظار\\n📞 02-1234-5678',",
  "        ru: '📍 Как добраться до Yonsei Purmi Dermatology\\n\\n📌 5 этаж, здание Purmi, 123 Gangnam-daero, Сеул\\n\\n🚇 3 минуты пешком от выхода 2 станции Gangnam\\n🚗 Бесплатная парковка 1 час\\n📞 02-1234-5678',",
  "        fr: '📍 Comment se rendre à Yonsei Purmi Dermatology\\n\\n📌 5ème étage, Purmi Bldg, 123 Gangnam-daero, Séoul\\n\\n🚇 3 min à pied de la sortie 2 de la station Gangnam\\n🚗 1 heure de stationnement gratuit\\n📞 02-1234-5678',",
  "        es: '📍 Cómo llegar a Yonsei Purmi Dermatology\\n\\n📌 Piso 5, Purmi Bldg, 123 Gangnam-daero, Seúl\\n\\n🚇 3 min a pie desde la salida 2 de la estación Gangnam\\n🚗 1 hora de estacionamiento gratuito\\n📞 02-1234-5678'",
  "      };",
  "      const mapLabels = {",
  "        ko: '🗺️ 카카오맵 보기', en: '🗺️ View on Map', zh: '🗺️ 查看地图',",
  "        ja: '🗺️ 地図を見る', th: '🗺️ ดูแผนที่', vi: '🗺️ Xem bản đồ',",
  "        ar: '🗺️ عرض الخريطة', ru: '🗺️ Открыть карту', fr: '🗺️ Voir la carte', es: '🗺️ Ver mapa'",
  "      };",
  "      await sendCallback(callbackUrl,",
  "        dirTexts[lang] || dirTexts.ko,",
  "        [",
  "          { label: mapLabels[lang] || mapLabels.ko, action: 'webLink', webLinkUrl: 'https://map.kakao.com/?q=강남역피부과' },",
  "          { label: lt.home, action: 'message', messageText: '처음으로' }",
  "        ]",
  "      );",
  "      return;",
  "    }"
];

lines.splice(startIdx, endIdx - startIdx + 1, ...newBlock);
fs.writeFileSync(file, lines.join('\n'), 'utf8');
console.log('✅ 오시는길 다국어 완료');
