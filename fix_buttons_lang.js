const fs = require('fs');
const file = '/home/ubuntu/bookit-backend/src/routes/webhook.js';
let content = fs.readFileSync(file, 'utf8');

// 오시는길 다국어
const oldLocation = `    if (userMessage === '오시는길') {
      await sendCallback(callbackUrl,
        "📍 연세푸르미피부과 오시는 길\\n\\n📌 서울 강남구 강남대로 123 푸르미빌딩 5층\\n\\n🚇 강남역 2번 출구 도보 3분\\n🚗 건물 내 주차 1시간 무료\\n📞 02-1234-5678",
        [
          { label: "🗺️ 카카오맵 보기", action: "webLink", webLinkUrl: "https://map.kakao.com/?q=강남역피부과" } ,
          { label: "🏠 처음으로", action: "message", messageText: "처음으로" }
        ]
      );
      return;
    }`;

const newLocation = `    if (userMessage === '오시는길') {
      const lang = session.data.lang || 'ko';
      const lt = LANG_TEXTS[lang] || LANG_TEXTS.ko;
      const locTexts = {
        ko: "📍 연세푸르미피부과 오시는 길\\n\\n📌 서울 강남구 강남대로 123 푸르미빌딩 5층\\n\\n🚇 강남역 2번 출구 도보 3분\\n🚗 건물 내 주차 1시간 무료\\n📞 02-1234-5678",
        en: "📍 How to get to Yonsei Purumi\\n\\n📌 5F Purumi Building, 123 Gangnam-daero, Gangnam-gu, Seoul\\n\\n🚇 3 min walk from Gangnam Station Exit 2\\n🚗 1 hour free parking\\n📞 02-1234-5678",
        zh: "📍 延世푸르미皮肤科地址\\n\\n📌 首尔江南区江南大路123号푸르미大厦5楼\\n\\n🚇 江南站2号出口步行3分钟\\n🚗 建筑内停车1小时免费\\n📞 02-1234-5678",
        ja: "📍 延世プルミ皮膚科へのアクセス\\n\\n📌 ソウル江南区江南大路123 プルミビル5階\\n\\n🚇 江南駅2番出口から徒歩3分\\n🚗 駐車場1時間無料\\n📞 02-1234-5678",
        th: "📍 วิธีเดินทาง\\n\\n📌 ชั้น 5 อาคาร Purumi 123 Gangnam-daero\\n\\n🚇 เดิน 3 นาทีจาก Gangnam Station ทางออก 2\\n🚗 จอดรถฟรี 1 ชั่วโมง\\n📞 02-1234-5678",
        vi: "📍 Đường đến phòng khám\\n\\n📌 Tầng 5 Tòa nhà Purumi, 123 Gangnam-daero\\n\\n🚇 Đi bộ 3 phút từ Cổng 2 ga Gangnam\\n🚗 Đỗ xe miễn phí 1 giờ\\n📞 02-1234-5678",
        ar: "📍 كيفية الوصول\\n\\n📌 الطابق 5، مبنى بوروري، 123 شارع غانغنام\\n\\n🚇 3 دقائق سيراً من مخرج 2 محطة غانغنام\\n🚗 ساعة مجانية لركن السيارات\\n📞 02-1234-5678",
        ru: "📍 Как добраться\\n\\n📌 5 этаж, здание Пуруми, 123 Гангнам-daero\\n\\n🚇 3 минуты пешком от выхода 2 станции Гангнам\\n🚗 1 час бесплатной парковки\\n📞 02-1234-5678",
        fr: "📍 Comment nous trouver\\n\\n📌 5ème étage, Purumi Building, 123 Gangnam-daero\\n\\n🚇 3 min à pied de la sortie 2 de Gangnam Station\\n🚗 1 heure de parking gratuit\\n📞 02-1234-5678",
        es: "📍 Cómo llegar\\n\\n📌 Piso 5, Edificio Purumi, 123 Gangnam-daero\\n\\n🚇 3 min a pie desde la salida 2 de Gangnam Station\\n🚗 1 hora de estacionamiento gratis\\n📞 02-1234-5678"
      };
      const mapLabels = { ko: "🗺️ 카카오맵 보기", en: "🗺️ View on Map", zh: "🗺️ 查看地图", ja: "🗺️ 地図を見る", th: "🗺️ ดูแผนที่", vi: "🗺️ Xem bản đồ", ar: "🗺️ عرض الخريطة", ru: "🗺️ Смотреть карту", fr: "🗺️ Voir la carte", es: "🗺️ Ver mapa" };
      await sendCallback(callbackUrl, locTexts[lang] || locTexts.ko, [
        { label: mapLabels[lang] || mapLabels.ko, action: "webLink", webLinkUrl: "https://map.kakao.com/?q=강남역피부과" },
        { label: lt.home, action: "message", messageText: "처음으로" }
      ]);
      return;
    }`;

if (content.includes(oldLocation)) {
  content = content.replace(oldLocation, newLocation);
  console.log('✅ 오시는길 다국어 완료');
} else {
  console.log('❌ 오시는길 텍스트 못 찾음');
}

fs.writeFileSync(file, content, 'utf8');

// 진료시간 찾아서 다국어 적용
content = fs.readFileSync(file, 'utf8');
const hoursIdx = content.indexOf("if (userMessage === '진료시간')");
if (hoursIdx !== -1) {
  console.log('✅ 진료시간 블록 찾음');
  // 진료시간 블록 교체
  const oldHours = content.slice(hoursIdx, content.indexOf('return;\n    }', hoursIdx) + 'return;\n    }'.length);
  const newHours = `if (userMessage === '진료시간') {
      const lang = session.data.lang || 'ko';
      const lt = LANG_TEXTS[lang] || LANG_TEXTS.ko;
      const hoursTexts = {
        ko: "⏰ 진료시간 안내\\n\\n월~금: 09:00 - 18:00\\n토요일: 09:00 - 15:00\\n일/공휴일: 휴진\\n\\n점심시간: 13:00 - 14:00\\n\\n📞 전화예약: 02-1234-5678",
        en: "⏰ Business Hours\\n\\nMon-Fri: 09:00 - 18:00\\nSaturday: 09:00 - 15:00\\nSun/Holidays: Closed\\n\\nLunch: 13:00 - 14:00\\n\\n📞 Phone: 02-1234-5678",
        zh: "⏰ 营业时间\\n\\n周一至周五: 09:00 - 18:00\\n周六: 09:00 - 15:00\\n周日/节假日: 休息\\n\\n午休: 13:00 - 14:00\\n\\n📞 电话: 02-1234-5678",
        ja: "⏰ 診療時間\\n\\n月〜金: 09:00 - 18:00\\n土曜日: 09:00 - 15:00\\n日/祝日: 休診\\n\\nランチ: 13:00 - 14:00\\n\\n📞 電話: 02-1234-5678",
        th: "⏰ เวลาทำการ\\n\\nจ-ศ: 09:00 - 18:00\\nเสาร์: 09:00 - 15:00\\nอาทิตย์/วันหยุด: ปิด\\n\\nพักกลางวัน: 13:00 - 14:00\\n\\n📞 โทร: 02-1234-5678",
        vi: "⏰ Giờ làm việc\\n\\nT2-T6: 09:00 - 18:00\\nThứ 7: 09:00 - 15:00\\nCN/Lễ: Nghỉ\\n\\nNghỉ trưa: 13:00 - 14:00\\n\\n📞 Điện thoại: 02-1234-5678",
        ar: "⏰ ساعات العمل\\n\\nإثنين-جمعة: 09:00 - 18:00\\nالسبت: 09:00 - 15:00\\nأحد/عطلات: مغلق\\n\\nاستراحة الغداء: 13:00 - 14:00\\n\\n📞 هاتف: 02-1234-5678",
        ru: "⏰ Часы работы\\n\\nПн-Пт: 09:00 - 18:00\\nСуббота: 09:00 - 15:00\\nВс/праздники: Закрыто\\n\\nОбед: 13:00 - 14:00\\n\\n📞 Телефон: 02-1234-5678",
        fr: "⏰ Heures d'ouverture\\n\\nLun-Ven: 09:00 - 18:00\\nSamedi: 09:00 - 15:00\\nDim/Fériés: Fermé\\n\\nDéjeuner: 13:00 - 14:00\\n\\n📞 Tél: 02-1234-5678",
        es: "⏰ Horario\\n\\nLun-Vie: 09:00 - 18:00\\nSábado: 09:00 - 15:00\\nDom/Festivos: Cerrado\\n\\nAlmuerzo: 13:00 - 14:00\\n\\n📞 Tel: 02-1234-5678"
      };
      await sendCallback(callbackUrl, hoursTexts[lang] || hoursTexts.ko,
        [{ label: lt.home, action: "message", messageText: "처음으로" }]
      );
      return;
    }`;
  content = content.slice(0, hoursIdx) + newHours + content.slice(hoursIdx + oldHours.length);
  fs.writeFileSync(file, content, 'utf8');
  console.log('✅ 진료시간 다국어 완료');
}
