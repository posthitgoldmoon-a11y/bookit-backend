const fs = require('fs');
const path = require('path');

function getClinicInfo(industry) {
  try {
    const txt = fs.readFileSync(path.join(__dirname, '../prompts', `${industry}.txt`), 'utf-8');
    const get = (key) => {
      const m = txt.match(new RegExp('- ' + key + ':\\s*(.+)'));
      return m ? m[1].trim() : '';
    };

    const phone = get('전화');
    const parking = get('주차');
    const kakaoMap = get('카카오맵');
    const bannerImg = get('배너이미지');
    const bizName = get('상호');

    // 오시는 길
    const dirTexts = {};
    const langs = ['ko','en','zh','ja','th','vi','ar','ru','fr','es'];
    const dirTitles = {
      ko:'📍 오시는 길', en:'📍 Directions', zh:'📍 交通指南',
      ja:'📍 アクセス', th:'📍 ทิศทาง', vi:'📍 Đường đến',
      ar:'📍 الاتجاهات', ru:'📍 Как добраться', fr:'📍 Comment se rendre', es:'📍 Cómo llegar'
    };
    langs.forEach(l => {
      const addr = get('주소_' + l) || get('주소_ko');
      const transit = get('교통_' + l) || get('교통_ko');
      dirTexts[l] = dirTitles[l] + ' ' + bizName + '\n\n📌 ' + addr + '\n\n🚇 ' + transit + '\n🚗 ' + parking + '\n📞 ' + phone;
    });

    // 진료시간
    const mon_thu = get('월·화·목');
    const fri = get('금요일');
    const sat = get('토요일');
    const sun = get('일요일·공휴일');
    const lunch_mtt = get('점심_월화목');
    const lunch_fri = get('점심_금');

    const hoursTexts = {
      ko: '⏰ 진료시간 안내\n\n월·화·목: ' + mon_thu + '\n금요일: ' + fri + '\n토요일: ' + sat + '\n일요일·공휴일: ' + sun + '\n\n📞 전화예약: ' + phone,
      en: '⏰ Business Hours\n\nMon·Tue·Thu: ' + mon_thu + '\nFriday: ' + fri + '\nSaturday: ' + sat + '\nSun/Holidays: Closed\n\n📞 Phone: ' + phone,
      zh: '⏰ 营业时间\n\n周一·二·四: ' + mon_thu + '\n周五: ' + fri + '\n周六: ' + sat + '\n周日/节假日: 休息\n\n午休 (周一·二·四): ' + lunch_mtt + '\n午休 (周五): ' + lunch_fri + '\n\n📞 电话: ' + phone,
      ja: '⏰ 診療時間\n\n月·火·木: ' + mon_thu + '\n金曜日: ' + fri + '\n土曜日: ' + sat + '\n日/祝日: 休診\n\nランチ (月·火·木): ' + lunch_mtt + '\nランチ (金): ' + lunch_fri + '\n\n📞 電話: ' + phone,
      th: '⏰ เวลาทำการ\n\nจ·อ·พฤ: ' + mon_thu + '\nศุกร์: ' + fri + '\nเสาร์: ' + sat + '\nอาทิตย์/วันหยุด: ปิด\n\nพักกลางวัน (จ·อ·พฤ): ' + lunch_mtt + '\nพักกลางวัน (ศ): ' + lunch_fri + '\n\n📞 โทร: ' + phone,
      vi: '⏰ Giờ làm việc\n\nT2·T3·T5: ' + mon_thu + '\nThứ 6: ' + fri + '\nThứ 7: ' + sat + '\nCN/Lễ: Nghỉ\n\nNghỉ trưa (T2·T3·T5): ' + lunch_mtt + '\nNghỉ trưa (T6): ' + lunch_fri + '\n\n📞 Điện thoại: ' + phone,
      ar: '⏰ ساعات العمل\n\nإثنين·ثلاثاء·خميس: ' + mon_thu + '\nالجمعة: ' + fri + '\nالسبت: ' + sat + '\nأحد/عطلات: مغلق\n\nاستراحة (إثنين·ثلاثاء·خميس): ' + lunch_mtt + '\nاستراحة (جمعة): ' + lunch_fri + '\n\n📞 هاتف: ' + phone,
      ru: '⏰ Часы работы\n\nПн·Вт·Чт: ' + mon_thu + '\nПятница: ' + fri + '\nСуббота: ' + sat + '\nВс/праздники: Закрыто\n\nОбед (Пн·Вт·Чт): ' + lunch_mtt + '\nОбед (Пт): ' + lunch_fri + '\n\n📞 Телефон: ' + phone,
      fr: "⏰ Heures d'ouverture\n\nLun·Mar·Jeu: " + mon_thu + '\nVendredi: ' + fri + '\nSamedi: ' + sat + '\nDim/Fériés: Fermé\n\nDéjeuner (Lun·Mar·Jeu): ' + lunch_mtt + '\nDéjeuner (Ven): ' + lunch_fri + '\n\n📞 Tél: ' + phone,
      es: '⏰ Horario\n\nLun·Mar·Jue: ' + mon_thu + '\nViernes: ' + fri + '\nSábado: ' + sat + '\nDom/Festivos: Cerrado\n\nAlmuerzo (Lun·Mar·Jue): ' + lunch_mtt + '\nAlmuerzo (Vie): ' + lunch_fri + '\n\n📞 Tel: ' + phone
    };

    // 의사 예약 키워드
    const doctorKeywords = [];
    const secMarker = '## 의사목록';
    const secIdx = txt.indexOf(secMarker);
    if (secIdx !== -1) {
      const secEnd = txt.indexOf('\n##', secIdx + secMarker.length);
      const secText = secEnd !== -1 ? txt.slice(secIdx + secMarker.length, secEnd) : txt.slice(secIdx + secMarker.length);
      secText.split('\n').forEach(l => {
        const m = l.match(/^- (.+)/);
        if (m) doctorKeywords.push(m[1].trim());
      });
    }

    return { phone, parking, kakaoMap, bannerImg, bizName, dirTexts, hoursTexts, doctorKeywords };
  } catch(e) {
    console.error('getClinicInfo 오류:', e.message);
    return { phone:'', parking:'', kakaoMap:'', bannerImg:'', bizName:'', dirTexts:{}, hoursTexts:{}, doctorKeywords:[] };
  }
}

module.exports = { getClinicInfo };
