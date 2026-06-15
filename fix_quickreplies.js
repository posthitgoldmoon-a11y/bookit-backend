const fs = require('fs');
const file = '/home/ubuntu/bookit-backend/src/routes/webhook.js';
let content = fs.readFileSync(file, 'utf8');

// mainQuickReplies 다국어 함수 추가
const oldMainQR = `const mainQuickReplies = [
  { label: "📅 예약하기", action: "message", messageText: "예약하기" },
  { label: "💬 상담하기", action: "message", messageText: "상담하기" },
  { label: "🌍 언어선택", action: "message", messageText: "언어선택" },
  { label: "💰 가격안내", action: "message", messageText: "가격안내" },
  { label: "👨‍⚕️ 의료진 보기", action: "message", messageText: "의료진보기" },
  { label: "📍 오시는 길", action: "message", messageText: "오시는길" },
  { label: "⏰ 진료시간", action: "message", messageText: "진료시간" }
];`;

const newMainQR = `const mainQuickReplies = [
  { label: "📅 예약하기", action: "message", messageText: "예약하기" },
  { label: "💬 상담하기", action: "message", messageText: "상담하기" },
  { label: "🌍 언어선택", action: "message", messageText: "언어선택" },
  { label: "💰 가격안내", action: "message", messageText: "가격안내" },
  { label: "👨‍⚕️ 의료진 보기", action: "message", messageText: "의료진보기" },
  { label: "📍 오시는 길", action: "message", messageText: "오시는길" },
  { label: "⏰ 진료시간", action: "message", messageText: "진료시간" }
];

function getQuickReplies(lang = 'ko') {
  const qr = {
    ko: [
      { label: "📅 예약하기", action: "message", messageText: "예약하기" },
      { label: "💬 상담하기", action: "message", messageText: "상담하기" },
      { label: "🌍 언어선택", action: "message", messageText: "언어선택" },
      { label: "💰 가격안내", action: "message", messageText: "가격안내" },
      { label: "👨‍⚕️ 의료진 보기", action: "message", messageText: "의료진보기" },
      { label: "📍 오시는 길", action: "message", messageText: "오시는길" },
      { label: "⏰ 진료시간", action: "message", messageText: "진료시간" }
    ],
    en: [
      { label: "📅 Book", action: "message", messageText: "예약하기" },
      { label: "💬 Consult", action: "message", messageText: "상담하기" },
      { label: "🌍 Language", action: "message", messageText: "언어선택" },
      { label: "💰 Prices", action: "message", messageText: "가격안내" },
      { label: "👨‍⚕️ Doctors", action: "message", messageText: "의료진보기" },
      { label: "📍 Location", action: "message", messageText: "오시는길" },
      { label: "⏰ Hours", action: "message", messageText: "진료시간" }
    ],
    zh: [
      { label: "📅 预约", action: "message", messageText: "예약하기" },
      { label: "💬 咨询", action: "message", messageText: "상담하기" },
      { label: "🌍 语言", action: "message", messageText: "언어선택" },
      { label: "💰 价格", action: "message", messageText: "가격안내" },
      { label: "👨‍⚕️ 医生", action: "message", messageText: "의료진보기" },
      { label: "📍 地址", action: "message", messageText: "오시는길" },
      { label: "⏰ 营业时间", action: "message", messageText: "진료시간" }
    ],
    ja: [
      { label: "📅 予約", action: "message", messageText: "예약하기" },
      { label: "💬 相談", action: "message", messageText: "상담하기" },
      { label: "🌍 言語", action: "message", messageText: "언어선택" },
      { label: "💰 料金", action: "message", messageText: "가격안내" },
      { label: "👨‍⚕️ 医師", action: "message", messageText: "의료진보기" },
      { label: "📍 アクセス", action: "message", messageText: "오시는길" },
      { label: "⏰ 診療時間", action: "message", messageText: "진료시간" }
    ],
    th: [
      { label: "📅 จอง", action: "message", messageText: "예약하기" },
      { label: "💬 ปรึกษา", action: "message", messageText: "상담하기" },
      { label: "🌍 ภาษา", action: "message", messageText: "언어선택" },
      { label: "💰 ราคา", action: "message", messageText: "가격안내" },
      { label: "👨‍⚕️ แพทย์", action: "message", messageText: "의료진보기" },
      { label: "📍 ที่อยู่", action: "message", messageText: "오시는길" },
      { label: "⏰ เวลา", action: "message", messageText: "진료시간" }
    ],
    vi: [
      { label: "📅 Đặt lịch", action: "message", messageText: "예약하기" },
      { label: "💬 Tư vấn", action: "message", messageText: "상담하기" },
      { label: "🌍 Ngôn ngữ", action: "message", messageText: "언어선택" },
      { label: "💰 Giá cả", action: "message", messageText: "가격안내" },
      { label: "👨‍⚕️ Bác sĩ", action: "message", messageText: "의료진보기" },
      { label: "📍 Địa chỉ", action: "message", messageText: "오시는길" },
      { label: "⏰ Giờ làm", action: "message", messageText: "진료시간" }
    ],
    ar: [
      { label: "📅 حجز", action: "message", messageText: "예약하기" },
      { label: "💬 استشارة", action: "message", messageText: "상담하기" },
      { label: "🌍 اللغة", action: "message", messageText: "언어선택" },
      { label: "💰 الأسعار", action: "message", messageText: "가격안내" },
      { label: "👨‍⚕️ الأطباء", action: "message", messageText: "의료진보기" },
      { label: "📍 الموقع", action: "message", messageText: "오시는길" },
      { label: "⏰ المواعيد", action: "message", messageText: "진료시간" }
    ],
    ru: [
      { label: "📅 Запись", action: "message", messageText: "예약하기" },
      { label: "💬 Консультация", action: "message", messageText: "상담하기" },
      { label: "🌍 Язык", action: "message", messageText: "언어선택" },
      { label: "💰 Цены", action: "message", messageText: "가격안내" },
      { label: "👨‍⚕️ Врачи", action: "message", messageText: "의료진보기" },
      { label: "📍 Адрес", action: "message", messageText: "오시는길" },
      { label: "⏰ Часы работы", action: "message", messageText: "진료시간" }
    ],
    fr: [
      { label: "📅 Réserver", action: "message", messageText: "예약하기" },
      { label: "💬 Consulter", action: "message", messageText: "상담하기" },
      { label: "🌍 Langue", action: "message", messageText: "언어선택" },
      { label: "💰 Tarifs", action: "message", messageText: "가격안내" },
      { label: "👨‍⚕️ Médecins", action: "message", messageText: "의료진보기" },
      { label: "📍 Adresse", action: "message", messageText: "오시는길" },
      { label: "⏰ Horaires", action: "message", messageText: "진료시간" }
    ],
    es: [
      { label: "📅 Reservar", action: "message", messageText: "예약하기" },
      { label: "💬 Consultar", action: "message", messageText: "상담하기" },
      { label: "🌍 Idioma", action: "message", messageText: "언어선택" },
      { label: "💰 Precios", action: "message", messageText: "가격안내" },
      { label: "👨‍⚕️ Médicos", action: "message", messageText: "의료진보기" },
      { label: "📍 Dirección", action: "message", messageText: "오시는길" },
      { label: "⏰ Horario", action: "message", messageText: "진료시간" }
    ]
  };
  return qr[lang] || qr.ko;
}`;

if (content.includes(oldMainQR)) {
  content = content.replace(oldMainQR, newMainQR);
  fs.writeFileSync(file, content, 'utf8');
  console.log('✅ getQuickReplies 함수 추가 완료');
} else {
  console.log('❌ mainQuickReplies 텍스트 못 찾음');
}

// showWelcome에서 mainQuickReplies 대신 getQuickReplies(lang) 사용
content = fs.readFileSync(file, 'utf8');
content = content.replace(
  `        quickReplies: mainQuickReplies\n      }\n    };\n    console.log('페이로드 생성완료, 전송시작');\n    const res = await fetch(callbackUrl, {\n      method: 'POST',\n      headers: { 'Content-Type': 'application/json' },\n      body: JSON.stringify(payload)\n    });\n    const resText = await res.text();\n    console.log('showWelcome 응답:', res.status, resText);\n  } catch(e) {\n    console.error('showWelcome 오류:', e.message);\n  }\n}`,
  `        quickReplies: getQuickReplies(lang)\n      }\n    };\n    console.log('페이로드 생성완료, 전송시작');\n    const res = await fetch(callbackUrl, {\n      method: 'POST',\n      headers: { 'Content-Type': 'application/json' },\n      body: JSON.stringify(payload)\n    });\n    const resText = await res.text();\n    console.log('showWelcome 응답:', res.status, resText);\n  } catch(e) {\n    console.error('showWelcome 오류:', e.message);\n  }\n}`
);
fs.writeFileSync(file, content, 'utf8');
console.log('✅ showWelcome quickReplies 교체 완료');
