const express = require('express');
const router = express.Router();
const fetch = (...args) => import('node-fetch').then(({default: fetch}) => fetch(...args));
const { chat } = require('../services/gemini');
require('dotenv').config();

const sessions = {};
const BASE_URL = `http://${process.env.SERVER_IP}:3002`;

// ─── 프롬프트 파일 카드 파서 ───────────────────────────────
function parseCardSection(industry, sectionName, lang = 'ko') {
  try {
    const fs = require('fs');
    const path = require('path');
    const promptPath = path.join(__dirname, '../prompts', `${industry}.txt`);
    const text = fs.readFileSync(promptPath, 'utf-8');
    // 언어별 섹션 우선 시도 (예: 카드_상담메뉴_en)
    const langSection = lang !== 'ko' ? sectionName + '_' + lang : null;
    const tryNames = langSection ? [langSection, sectionName] : [sectionName];
    for (const name of tryNames) {
      const regex = new RegExp('## ' + name + '\\n([\\s\\S]*?)(?=\\n##|$)');
      const match = text.match(regex);
      if (match) {
        return match[1].trim().split('\n')
          .filter(line => line.trim())
          .map(line => {
            const parts = line.split(' | ');
            return {
              title: parts[0] ? parts[0].trim() : '',
              desc: parts[1] ? parts[1].trim().replace(/\\n/g, '\n') : '',
              msg: parts[2] ? parts[2].trim() : '',
              img: parts[3] ? parts[3].trim() : ''
            };
          });
      }
    }
    return [];
  } catch(e) {
    console.error('parseCardSection 오류:', e.message);
    return [];
  }
}
// ────────────────────────────────────────────────────────────


const INDUSTRIES = {
  ko: [
    { title: '🏥 병원동행', desc: '접수부터 수납까지 보호자처럼', msg: '병원동행', img: 'banner_hospital_companion.jpg' },
    { title: '🏨 병원', desc: '전문의와 함께하는 진료 예약', msg: '병원', img: 'banner_hospital.jpg' },
    { title: '🍽️ 식당', desc: '특별한 날을 위한 레스토랑', msg: '식당', img: 'banner_restaurant.jpg' },
    { title: '💇 미용실', desc: '나만의 스타일을 찾아드려요', msg: '미용실', img: 'banner_beauty.jpg' },
    { title: '🏨 숙박', desc: '편안한 휴식을 위한 숙소', msg: '숙박', img: 'banner_accommodation.jpg' },
    { title: '💆 마사지', desc: '몸과 마음의 힐링', msg: '마사지', img: 'banner_massage.jpg' },
    { title: '✈️ 공항택시', desc: '안전하고 편안한 공항 이동', msg: '공항택시', img: 'banner_airport_taxi.jpg' },
    { title: '🐾 동물병원', desc: '소중한 반려동물의 건강', msg: '동물병원', img: 'banner_vet.jpg' },
    { title: '🏯 템플스테이', desc: '마음을 치유하는 사찰 체험', msg: '템플스테이', img: 'banner_templestay.jpg' },
    { title: '✨ 피부관리', desc: '빛나는 피부를 위한 케어', msg: '피부관리', img: 'banner_skincare.jpg' },
    { title: '⛳ 골프', desc: '그린 위의 특별한 라운드', msg: '골프', img: 'banner_golf.jpg' },
    { title: '🚗 렌트카', desc: '자유로운 여행을 위한 렌터카', msg: '렌트카', img: 'banner_rentcar.jpg' },
    { title: '🧗 액티비티', desc: '짜릿한 야외 액티비티', msg: '액티비티', img: 'banner_activity.jpg' },
    { title: '🏋️ 체육시설', desc: '건강한 몸을 위한 운동', msg: '체육시설', img: 'banner_sports.jpg' },
    { title: '🎉 파티룸', desc: '특별한 파티를 위한 공간', msg: '파티룸', img: 'banner_partyroom.jpg' },
    { title: '💅 네일샵', desc: '아름다운 손끝을 위한 케어', msg: '네일샵', img: 'banner_nail.jpg' },
    { title: '📸 사진스튜디오', desc: '소중한 순간을 담아드려요', msg: '사진스튜디오', img: 'banner_studio.jpg' },
    { title: '📚 스터디카페', desc: '집중할 수 있는 공간', msg: '스터디카페', img: 'banner_studycafe.jpg' },
    { title: '🧘 요가/필라테스', desc: '몸과 마음의 균형', msg: '요가', img: 'banner_yoga.jpg' },
    { title: '🏊 수영/볼링', desc: '즐거운 스포츠 활동', msg: '수영', img: 'banner_swimming.jpg' }
  ],
  en: [
    { title: '🏥 Hospital Companion', desc: 'From registration to payment', msg: '병원동행', img: 'banner_hospital_companion.jpg' },
    { title: '🏨 Hospital', desc: 'Medical appointment booking', msg: '병원', img: 'banner_hospital.jpg' },
    { title: '🍽️ Restaurant', desc: 'Special dining experiences', msg: '식당', img: 'banner_restaurant.jpg' },
    { title: '💇 Hair Salon', desc: 'Find your perfect style', msg: '미용실', img: 'banner_beauty.jpg' },
    { title: '🏨 Accommodation', desc: 'Comfortable stay options', msg: '숙박', img: 'banner_accommodation.jpg' },
    { title: '💆 Massage', desc: 'Healing body and mind', msg: '마사지', img: 'banner_massage.jpg' },
    { title: '✈️ Airport Taxi', desc: 'Safe airport transfers', msg: '공항택시', img: 'banner_airport_taxi.jpg' },
    { title: '🐾 Vet Clinic', desc: 'Pet health care', msg: '동물병원', img: 'banner_vet.jpg' },
    { title: '🏯 Temple Stay', desc: 'Healing temple experience', msg: '템플스테이', img: 'banner_templestay.jpg' },
    { title: '✨ Skin Care', desc: 'Glowing skin treatments', msg: '피부관리', img: 'banner_skincare.jpg' },
    { title: '⛳ Golf', desc: 'Special rounds on the green', msg: '골프', img: 'banner_golf.jpg' },
    { title: '🚗 Car Rental', desc: 'Freedom to explore', msg: '렌트카', img: 'banner_rentcar.jpg' },
    { title: '🧗 Activity', desc: 'Thrilling outdoor activities', msg: '액티비티', img: 'banner_activity.jpg' },
    { title: '🏋️ Sports Facility', desc: 'Stay fit and healthy', msg: '체육시설', img: 'banner_sports.jpg' },
    { title: '🎉 Party Room', desc: 'Perfect party spaces', msg: '파티룸', img: 'banner_partyroom.jpg' },
    { title: '💅 Nail Shop', desc: 'Beautiful nail care', msg: '네일샵', img: 'banner_nail.jpg' },
    { title: '📸 Photo Studio', desc: 'Capture precious moments', msg: '사진스튜디오', img: 'banner_studio.jpg' },
    { title: '📚 Study Cafe', desc: 'Focus and study space', msg: '스터디카페', img: 'banner_studycafe.jpg' },
    { title: '🧘 Yoga/Pilates', desc: 'Balance body and mind', msg: '요가', img: 'banner_yoga.jpg' },
    { title: '🏊 Swimming/Bowling', desc: 'Fun sports activities', msg: '수영', img: 'banner_swimming.jpg' }
  ]
};

const INDUSTRY_MAP = {
  '병원동행': 'hospital_companion', '병원': 'hospital', '식당': 'restaurant',
  '미용실': 'beauty', '숙박': 'accommodation', '마사지': 'massage',
  '공항택시': 'airport_taxi', '동물병원': 'vet', '템플스테이': 'templestay',
  '피부관리': 'skincare', '골프': 'golf', '렌트카': 'rentcar',
  '액티비티': 'activity', '체육시설': 'sports', '파티룸': 'partyroom',
  '네일샵': 'nail', '사진스튜디오': 'studio', '스터디카페': 'studycafe',
  '요가': 'yoga', '수영': 'swimming'
};

async function showIndustryCarousel(callbackUrl, lang = 'ko') {
  const list = INDUSTRIES[lang] || INDUSTRIES.ko;
  const row1 = list.slice(0, 10);
  const row2 = list.slice(10);
  const titles = {
    ko: '어떤 업종을 시연할까요? 😊\n업종을 선택해주세요!',
    en: 'Which industry would you like to demo? 😊\nPlease select!',
    zh: '您想演示哪个行业？😊\n请选择！',
    ja: 'どの業種をデモしますか？😊\n選択してください！'
  };
  const selectLabels = { ko: '선택하기', en: 'Select', zh: '选择', ja: '選択' };
  const titleText = titles[lang] || titles.ko;
  const selectLabel = selectLabels[lang] || selectLabels.ko;
  const makeItems = arr => arr.map(item => ({
    title: item.title,
    description: item.desc,
    thumbnail: { imageUrl: `${BASE_URL}/${item.img}` },
    buttons: [{ action: 'message', label: selectLabel, messageText: item.msg }]
  }));
  await fetch(callbackUrl, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      version: '2.0',
      template: {
        outputs: [
          { simpleText: { text: titleText } },
          { carousel: { type: 'basicCard', items: makeItems(row1) } },
          { carousel: { type: 'basicCard', items: makeItems(row2) } }
        ]
      }
    })
  });
}



function getSession(userId) {
  if (!sessions[userId]) {
    sessions[userId] = { history: [], data: {}, booted: false, visited: false, industry: null };
  }
  return sessions[userId];
}

async function sendTelegram(text) {
  try {
    await fetch(`https://api.telegram.org/bot${process.env.TELEGRAM_BOT_TOKEN}/sendMessage`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ chat_id: process.env.TELEGRAM_CHAT_ID, text })
    });
  } catch(e) { console.error('텔레그램 오류:', e.message); }
}


function extractPhone(text) {
  if (!text) return null;
  // 국제번호 +로 시작
  const intl = text.match(/\+[0-9][\d\s\-]{7,14}/);
  if (intl) return intl[0].trim();
  // 한국 번호 010-xxxx-xxxx
  const kr = text.match(/01[0-9][\-\s]?[0-9]{3,4}[\-\s]?[0-9]{4}/);
  if (kr) {
    const digits = kr[0].replace(/[\-\s]/g, '');
    if (digits.length === 11) return digits.slice(0,3)+'-'+digits.slice(3,7)+'-'+digits.slice(7);
    return digits.slice(0,3)+'-'+digits.slice(3,6)+'-'+digits.slice(6);
  }
  // 외국 번호 8-12자리 숫자
  const foreign = text.match(/[0-9][\d\s\-]{7,11}[0-9]/);
  if (foreign) return foreign[0].trim();
  return null;
}

async function sendCallback(callbackUrl, text, quickReplies = null, buttons = null) {
  console.log('📤 sendCallback 전송 메시지:', JSON.stringify(text));
  // buttons가 있으면 basicCard로, 없으면 simpleText로
  let outputs;
  if (buttons) {
    outputs = [{ basicCard: { title: text, buttons: buttons } }];
  } else {
    outputs = [{ simpleText: { text } }];
  }
  const body = {
    version: "2.0",
    template: { outputs }
  };
  if (quickReplies) body.template.quickReplies = quickReplies;
  try {
    const res = await fetch(callbackUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body)
    });
    const resText = await res.text();
    console.log('콜백응답:', res.status, resText);
  } catch(e) { console.error('콜백오류:', e.message); }
}

const mainQuickReplies = [
  { label: "🎁 무료체험 신청", action: "message", messageText: "무료체험신청" },
  { label: "📅 예약하기", action: "message", messageText: "예약하기" },
  { label: "💬 상담하기", action: "message", messageText: "상담하기" },
  { label: "🌍 언어선택", action: "message", messageText: "언어선택" },
  { label: "💰 가격안내", action: "message", messageText: "가격안내" },
  { label: "👨‍⚕️ 의료진 보기", action: "message", messageText: "의료진보기" },
  { label: "📍 오시는 길", action: "message", messageText: "오시는길" },
  { label: "⏰ 진료시간", action: "message", messageText: "진료시간" }
];

function getQuickReplies(lang = 'ko', industry = 'hospital') {
  // 병원이 아닌 업종은 기본 퀵리플라이만
  if (industry && industry !== 'hospital') {
    return [
      { label: '🏠 처음으로', action: 'message', messageText: '처음으로' },
      { label: '🔄 업종변경', action: 'message', messageText: '처음으로' }
    ];
  }
  const qr = {
    ko: [
      { label: "🎁 무료체험 신청", action: "message", messageText: "무료체험신청" },
      { label: "📅 예약하기", action: "message", messageText: "예약하기" },
      { label: "💬 상담하기", action: "message", messageText: "상담하기" },
      { label: "🌍 언어선택", action: "message", messageText: "언어선택" },
      { label: "💰 가격안내", action: "message", messageText: "가격안내" },
      { label: "👨‍⚕️ 의료진 보기", action: "message", messageText: "의료진보기" },
      { label: "📍 오시는 길", action: "message", messageText: "오시는길" },
      { label: "⏰ 진료시간", action: "message", messageText: "진료시간" }
    ],
    en: [
      { label: "🎁 Free Trial", action: "message", messageText: "무료체험신청" },
      { label: "📅 Book", action: "message", messageText: "예약하기" },
      { label: "💬 Consult", action: "message", messageText: "상담하기" },
      { label: "🌍 Language", action: "message", messageText: "언어선택" },
      { label: "💰 Prices", action: "message", messageText: "가격안내" },
      { label: "👨‍⚕️ Doctors", action: "message", messageText: "의료진보기" },
      { label: "📍 Location", action: "message", messageText: "오시는길" },
      { label: "⏰ Hours", action: "message", messageText: "진료시간" }
    ],
    zh: [
      { label: "🎁 免费体验", action: "message", messageText: "무료체험신청" },
      { label: "📅 预约", action: "message", messageText: "예약하기" },
      { label: "💬 咨询", action: "message", messageText: "상담하기" },
      { label: "🌍 语言", action: "message", messageText: "언어선택" },
      { label: "💰 价格", action: "message", messageText: "가격안내" },
      { label: "👨‍⚕️ 医生", action: "message", messageText: "의료진보기" },
      { label: "📍 地址", action: "message", messageText: "오시는길" },
      { label: "⏰ 营业时间", action: "message", messageText: "진료시간" }
    ],
    ja: [
      { label: "🎁 無料体験", action: "message", messageText: "무료체험신청" },
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
}


// 공통 다국어 텍스트
const LANG_TEXTS = {
  ko: { home: "🏠 처음으로", homeMsg: "처음으로", error: "잠시 오류가 발생했습니다. 다시 시도해주세요 😊", calError: "캘린더에서 날짜를 먼저 선택해주세요! 📅", calRetry: "✅ 날짜선택완료", dateSelected: (dt) => `📅 ${dt} 선택하셨습니다!\n\n고객님 성함을 알려주세요 😊` },
  en: { home: "🏠 Home", homeMsg: "처음으로", error: "An error occurred. Please try again 😊", calError: "Please select a date from the calendar first! 📅", calRetry: "✅ Done", dateSelected: (dt) => `📅 ${dt} selected!\n\nMay I have your name please? 😊` },
  zh: { home: "🏠 首页", homeMsg: "처음으로", error: "发生错误，请重试 😊", calError: "请先从日历中选择日期！📅", calRetry: "✅ 完成", dateSelected: (dt) => `📅 已选择 ${dt}！\n\n请告诉我您的姓名 😊` },
  ja: { home: "🏠 ホーム", homeMsg: "처음으로", error: "エラーが発生しました。もう一度お試しください 😊", calError: "カレンダーから日付を選択してください！📅", calRetry: "✅ 選択完了", dateSelected: (dt) => `📅 ${dt} を選択しました！\n\nお名前を教えてください 😊` },
  th: { home: "🏠 หน้าหลัก", homeMsg: "처음으로", error: "เกิดข้อผิดพลาด กรุณาลองใหม่ 😊", calError: "กรุณาเลือกวันที่จากปฏิทินก่อน！📅", calRetry: "✅ เสร็จสิ้น", dateSelected: (dt) => `📅 เลือก ${dt} แล้ว！\n\nกรุณาแจ้งชื่อของคุณ 😊` },
  vi: { home: "🏠 Trang chủ", homeMsg: "처음으로", error: "Đã xảy ra lỗi. Vui lòng thử lại 😊", calError: "Vui lòng chọn ngày từ lịch trước！📅", calRetry: "✅ Hoàn thành", dateSelected: (dt) => `📅 Đã chọn ${dt}！\n\nCho tôi biết tên của bạn nhé 😊` },
  ar: { home: "🏠 الرئيسية", homeMsg: "처음으로", error: "حدث خطأ. يرجى المحاولة مرة أخرى 😊", calError: "يرجى اختيار تاريخ من التقويم أولاً！📅", calRetry: "✅ تم", dateSelected: (dt) => `📅 تم اختيار ${dt}！\n\nما اسمك من فضلك؟ 😊` },
  ru: { home: "🏠 Главная", homeMsg: "처음으로", error: "Произошла ошибка. Попробуйте снова 😊", calError: "Сначала выберите дату в календаре！📅", calRetry: "✅ Готово", dateSelected: (dt) => `📅 Выбрано ${dt}！\n\nКак вас зовут? 😊` },
  fr: { home: "🏠 Accueil", homeMsg: "처음으로", error: "Une erreur s'est produite. Veuillez réessayer 😊", calError: "Veuillez d'abord sélectionner une date！📅", calRetry: "✅ Terminé", dateSelected: (dt) => `📅 ${dt} sélectionné！\n\nPuis-je avoir votre nom? 😊` },
  es: { home: "🏠 Inicio", homeMsg: "처음으로", error: "Ocurrió un error. Por favor intente de nuevo 😊", calError: "¡Por favor seleccione una fecha del calendario primero！📅", calRetry: "✅ Listo", dateSelected: (dt) => `📅 ${dt} seleccionado！\n\n¿Me puede dar su nombre? 😊` }
};

router.post('/skill', handleMain);
router.post('/', handleMain);

async function handleMain(req, res) {
  res.status(200).json({ version: "2.0", useCallback: true });

  const body = req.body;
  const userMessage = body?.userRequest?.utterance?.trim() || '';
  const kakaoUserId = body?.userRequest?.user?.id || 'unknown';
  const callbackUrl = body?.userRequest?.callbackUrl;

  if (!callbackUrl) return;

  console.log('요청수신:', userMessage);
  console.log('콜백URL:', callbackUrl);

  const session = getSession(kakaoUserId);

  try {
    const resetKeywords = ['처음으로', '다시', '취소', '홈', '처음'];
    if (resetKeywords.includes(userMessage)) {
      session.history = [];
      session.data = {};
      session.booted = false;
      session.visited = true;
      await showWelcome(callbackUrl, session.data.lang || 'ko', session.industry || 'hospital');
      return;
    }

    if (!session.visited) {
      session.visited = true;
      await showWelcome(callbackUrl, session.data.lang || 'ko', session.industry || 'hospital');
      return;
    }


    // 전화번호 감지
    const phone = extractPhone(userMessage);
    if (phone && session.contactRequested && !session.phone && !session.waitingFor) {
      session.phone = phone;
      const lang = session.data.lang || 'ko';
      const confirmMsgs = {
        ko: `📞 전화번호 ${phone} 가 접수되었습니다!\n담당자가 곧 연락드릴게요 😊\n\n아래 버튼으로 예약을 직접 진행하실 수도 있어요!`,
        en: `📞 Phone number ${phone} received!\nOur staff will contact you soon 😊\n\nYou can also book directly using the buttons below!`,
        zh: `📞 电话号码 ${phone} 已收到！\n工作人员将很快与您联系 😊\n\n您也可以直接点击下方按钮预约！`,
        ja: `📞 電話番号 ${phone} を受け付けました！\n担当者がすぐにご連絡いたします 😊\n\n下のボタンから直接ご予約もできます！`,
        th: `📞 ได้รับเบอร์โทรศัพท์ ${phone} แล้ว!\nเจ้าหน้าที่จะติดต่อกลับเร็วๆ นี้ 😊`,
        vi: `📞 Đã nhận số điện thoại ${phone}!\nNhân viên sẽ liên hệ với bạn sớm 😊`,
        ar: `📞 تم استلام رقم الهاتف ${phone}!\nسيتصل بك موظفونا قريباً 😊`,
        ru: `📞 Номер телефона ${phone} получен!\nНаш сотрудник скоро свяжется с вами 😊`,
        fr: `📞 Numéro ${phone} reçu!\nNotre équipe vous contactera bientôt 😊`,
        es: `📞 Número ${phone} recibido!\nNuestro personal se pondrá en contacto pronto 😊`
      };
      const confirmMsg = confirmMsgs[lang] || confirmMsgs.ko;
      const bl = {
        ko: { naver: "🟢 네이버 예약", kakao: "🟡 카카오 채널 예약" },
        en: { naver: "🟢 Naver Booking", kakao: "🟡 KakaoTalk Booking" }
      };
      const b = bl[lang] || bl.ko;
      // 텔레그램 전송
      const historyText = session.history.slice(-4).map(h => (h.role === 'user' ? '👤 ' : '🤖 ') + h.content.substring(0, 50)).join('\n');
      await sendTelegram([
        '📱 전화번호 수집!',
        '━━━━━━━━━━━━━━',
        '📞 전화번호: ' + phone,
        '📝 상담내용: ' + (session.data.consultNote || session.data.service || '미선택'),
        '🌍 언어: ' + lang,
        '⏰ 시간: ' + new Date().toLocaleString('ko-KR', {timeZone: 'Asia/Seoul'}),
        '━━━━━━━━━━━━━━',
        '💬 최근 상담:',
        historyText,
        '━━━━━━━━━━━━━━',
        '📞 빠른 연락 부탁드립니다!'
      ].join('\n'));
      await fetch(callbackUrl, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          version: "2.0",
          template: {
            outputs: [
              { simpleText: { text: confirmMsg } },
              { basicCard: {
                title: "📋 예약 진행하기",
                buttons: [
                  { action: "webLink", label: b.naver, webLinkUrl: process.env.NAVER_BOOKING_URL || "https://booking.naver.com" },
                  { action: "message", label: b.kakao, messageText: "카카오예약하기" }
                ]
              }}
            ]
          }
        })
      });
      return;
    }
    // 언어 선택

    // 업종 선택 처리
    const selectedIndustry = INDUSTRY_MAP[userMessage];
    if (selectedIndustry) {
      session.industry = selectedIndustry;
      session.history = [];
      session.booted = false;
      const lang = session.data.lang || 'ko';
      let geminiReply;
      try {
        geminiReply = await chat([], userMessage, false, selectedIndustry, lang);
      } catch(e) {
        await sendCallback(callbackUrl, '잠시 오류가 발생했습니다. 다시 시도해주세요 😊');
        return;
      }
      session.booted = true;
      session.history.push({ role: 'user', content: userMessage });
      session.history.push({ role: 'model', content: geminiReply.message });
      const bannerImg = `${BASE_URL}/banner_${selectedIndustry}.jpg`;
      await fetch(callbackUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          version: '2.0',
          template: {
            outputs: [
              { basicCard: { title: '', thumbnail: { imageUrl: bannerImg } } },
              { simpleText: { text: geminiReply.message } }
            ],
            quickReplies: [
              { label: '🏠 처음으로', action: 'message', messageText: '처음으로' },
              { label: '🔄 업종변경', action: 'message', messageText: '처음으로' }
            ]
          }
        })
      });
      return;
    }

    // 업종 미선택 시 hospital 기본값 설정
    if (!session.industry) {
      session.industry = 'hospital';
    }

    const langMap = {
      "언어_한국어": "ko", "한국어": "ko",
      "언어_English": "en", "English": "en",
      "언어_中文": "zh", "中文": "zh",
      "언어_日本語": "ja", "日本語": "ja",
      "언어_ไทย": "th", "ไทย": "th",
      "언어_Tiếng Việt": "vi", "Tiếng Việt": "vi",
      "언어_العربية": "ar", "العربية": "ar",
      "언어_Русский": "ru", "Русский": "ru",
      "언어_Français": "fr", "Français": "fr",
      "언어_Español": "es", "Español": "es"
    };
    if (langMap[userMessage]) {
      session.data.lang = langMap[userMessage];
      if (session.data.pendingMenu === "상담하기") {
        await sendConsultMenu(callbackUrl, session.data.lang);
      } else if (session.data.pendingMenu === "예약하기") {
        await sendBookingMenu(callbackUrl, kakaoUserId, session.data.lang);
      } else {
        await showWelcome(callbackUrl, session.data.lang);
      }
      return;
    }

    if (userMessage === "언어선택") {
      await fetch(callbackUrl, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          version: "2.0",
          template: {
            outputs: [{ simpleText: { text: "언어를 선택해주세요 😊\nPlease select your language\n言語を選択してください\n请选择语言" } }],
            quickReplies: [
              { label: "🇰🇷 한국어", action: "message", messageText: "언어_한국어" },
              { label: "🇺🇸 English", action: "message", messageText: "언어_English" },
              { label: "🇨🇳 中文", action: "message", messageText: "언어_中文" },
              { label: "🇯🇵 日本語", action: "message", messageText: "언어_日本語" },
              { label: "🇹🇭 ไทย", action: "message", messageText: "언어_ไทย" },
              { label: "🇻🇳 Tiếng Việt", action: "message", messageText: "언어_Tiếng Việt" },
              { label: "🇸🇦 العربية", action: "message", messageText: "언어_العربية" },
              { label: "🇷🇺 Русский", action: "message", messageText: "언어_Русский" },
              { label: "🇫🇷 Français", action: "message", messageText: "언어_Français" },
              { label: "🇪🇸 Español", action: "message", messageText: "언어_Español" }
            ]
          }
        })
      });
      return;
    }

    if (userMessage === "예약하기" || userMessage === "상담하기") {
      session.data.pendingMenu = userMessage;
      // 언어 기본값 ko 설정
      if (!session.data.lang) session.data.lang = 'ko';
      if (userMessage === "상담하기") {
        await sendConsultMenu(callbackUrl, session.data.lang);
      } else {
        await sendBookingMenu(callbackUrl, kakaoUserId, session.data.lang);
      }
      return;
      await fetch(callbackUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          version: "2.0",
          template: {
            outputs: [{ simpleText: { text: "언어를 선택해주세요 😊\nPlease select your language\n言語を選択してください\n请选择语言" } }],
            quickReplies: [
              { label: "🇰🇷 한국어", action: "message", messageText: "언어_한국어" },
              { label: "🇺🇸 English", action: "message", messageText: "언어_English" },
              { label: "🇨🇳 中文", action: "message", messageText: "언어_中文" },
              { label: "🇯🇵 日本語", action: "message", messageText: "언어_日本語" },
              { label: "🇹🇭 ไทย", action: "message", messageText: "언어_ไทย" },
              { label: "🇻🇳 Tiếng Việt", action: "message", messageText: "언어_Tiếng Việt" },
              { label: "🇸🇦 العربية", action: "message", messageText: "언어_العربية" },
              { label: "🇷🇺 Русский", action: "message", messageText: "언어_Русский" },
              { label: "🇫🇷 Français", action: "message", messageText: "언어_Français" },
              { label: "🇪🇸 Español", action: "message", messageText: "언어_Español" }
            ]
          }
        })
      });
      return;
    }

    // 시술 선택 → 바로 캘린더
    const bookingKeywords = [
      // 레이저 시술
      "레이저토닝 예약하기", "토닝 예약하기",
      "색소레이저 예약하기", "기미제거 예약하기", "잡티제거 예약하기",
      "제모레이저 예약하기", "제모 예약하기",
      "피코슈어 예약하기", "피코레이저 예약하기",
      "루비레이저 예약하기",
      "엑셀브이 예약하기",
      "프락셀 예약하기",
      "CO2레이저 예약하기",
      // 보톡스/필러
      "보톡스 예약하기", "이마보톡스 예약하기", "사각턱보톡스 예약하기", "종아리보톡스 예약하기",
      "승모근보톡스 예약하기",
      "필러 예약하기", "이마필러 예약하기", "입술필러 예약하기", "코필러 예약하기",
      "팔자주름필러 예약하기",
      // 피부관리
      "수분리프팅 예약하기", "수분광관리 예약하기",
      "물광주사 예약하기",
      "스킨부스터 예약하기",
      "리쥬란힐러 예약하기", "리쥬란 예약하기",
      "쥬베룩 예약하기",
      "엑소좀 예약하기",
      "여드름케어 예약하기", "여드름 예약하기",
      "여드름흉터 예약하기", "흉터치료 예약하기",
      "모공관리 예약하기", "모공축소 예약하기",
      // 리프팅
      "리프팅 예약하기", "실리프팅 예약하기",
      "울쎄라 예약하기", "써마지 예약하기",
      "포텐자 예약하기",
      "하이코 예약하기",
      // 성형
      "쌍꺼풀 예약하기", "눈매교정 예약하기",
      "코성형 예약하기",
      "지방이식 예약하기",
      "윤곽주사 예약하기",
      // 기타
      "피부클리닉 예약하기",
      "무료상담 예약하기", "피부상담 예약하기",
      "피부분석 예약하기",
      "피부암검진 예약하기",
      // 원장 선택
      "김연세 원장으로 예약하기",
      "박푸르미 원장으로 예약하기",
      "이미소 원장으로 예약하기"
    ];
    // 예약 방식 선택
    const bookingTypeLabels = {
      ko: { title: "📋 예약 방법을 선택해 주세요", desc: "🟢 네이버 예약: 실시간 예약 현황을 확인하며 원하시는 날짜와 시간을 직접 선택하실 수 있습니다\n🟡 카카오 채널 예약: 예약 접수 후 담당자가 직접 전화드려 상담 후 예약을 확정해 드립니다", naver: "🟢 네이버 예약", kakao: "🟡 카카오 채널 예약" },
      en: { title: "📋 Select Booking Method", desc: "Please choose your preferred booking method!", naver: "🟢 Naver Booking", kakao: "🟡 KakaoTalk Booking" },
      zh: { title: "📋 选择预约方式", desc: "请选择您方便的预约方式！", naver: "🟢 Naver预约", kakao: "🟡 KakaoTalk预约" },
      ja: { title: "📋 予約方法を選択", desc: "ご希望の予約方法をお選びください！", naver: "🟢 Naver予約", kakao: "🟡 KakaoTalk予約" },
      th: { title: "📋 เลือกวิธีการจอง", desc: "กรุณาเลือกวิธีการจองที่สะดวก!", naver: "🟢 จองผ่าน Naver", kakao: "🟡 จองผ่าน KakaoTalk" },
      vi: { title: "📋 Chọn phương thức đặt lịch", desc: "Vui lòng chọn phương thức đặt lịch!", naver: "🟢 Đặt qua Naver", kakao: "🟡 Đặt qua KakaoTalk" },
      ar: { title: "📋 اختر طريقة الحجز", desc: "يرجى اختيار طريقة الحجز المفضلة!", naver: "🟢 حجز عبر Naver", kakao: "🟡 حجز عبر KakaoTalk" },
      ru: { title: "📋 Выберите способ бронирования", desc: "Выберите удобный способ бронирования!", naver: "🟢 Бронирование через Naver", kakao: "🟡 Бронирование через KakaoTalk" },
      fr: { title: "📋 Choisir la méthode de réservation", desc: "Veuillez choisir votre méthode de réservation!", naver: "🟢 Réservation Naver", kakao: "🟡 Réservation KakaoTalk" },
      es: { title: "📋 Seleccionar método de reserva", desc: "¡Por favor seleccione su método de reserva!", naver: "🟢 Reserva por Naver", kakao: "🟡 Reserva por KakaoTalk" }
    };

    if ((bookingKeywords.includes(userMessage) || userMessage.endsWith("예약하기")) && userMessage !== "카카오예약하기" && userMessage !== "네이버예약하기") {
      session.data.service = userMessage.replace(/\s*예약하기$/, "").replace(/\s*예약$/, "").replace("으로", "").trim() || session.data.service || "상담 후 결정";
      session.contactRequested = true;
      const lang = session.data.lang || 'ko';
      const bl = bookingTypeLabels[lang] || bookingTypeLabels.ko;
      const contactMsgs = {
        ko: '📞 예약 전 간단한 상담이 필요하시면 전화번호를 남겨주세요. 담당자가 직접 연락드려 최적의 시술과 일정을 안내해 드립니다 😊',
        en: '📞 Leave your phone number and our staff will confirm your reservation directly 😊 (Optional)',
        zh: '📞 留下您的电话号码，工作人员将直接为您确认预约 😊（可选）',
        ja: '📞 電話番号をお知らせいただければ、担当者が直接予約を確定いたします 😊（任意）',
        th: '📞 ฝากเบอร์โทรศัพท์ไว้ เจ้าหน้าที่จะยืนยันการจองให้คุณโดยตรง 😊 (ไม่บังคับ)',
        vi: '📞 Để lại số điện thoại, nhân viên sẽ xác nhận đặt lịch trực tiếp cho bạn 😊 (Tùy chọn)',
        ar: '📞 اترك رقم هاتفك وسيقوم موظفونا بتأكيد حجزك مباشرة 😊 (اختياري)',
        ru: '📞 Оставьте номер телефона, и сотрудник подтвердит вашу запись напрямую 😊 (Необязательно)',
        fr: '📞 Laissez votre numéro et notre équipe confirmera votre réservation directement 😊 (Optionnel)',
        es: '📞 Deje su número y nuestro personal confirmará su reserva directamente 😊 (Opcional)'
      };
      const contactMsg = contactMsgs[lang] || contactMsgs.ko;
      // 텔레그램 알림은 예약 완료 후 발송
      await fetch(callbackUrl, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          version: "2.0",
          template: {
            outputs: [
              { simpleText: { text: contactMsg } },
              { basicCard: {
                title: bl.title,
                description: bl.desc,
                buttons: [
                  { action: "message", label: bl.naver, messageText: "네이버예약클릭" },
                  { action: "message", label: bl.kakao, messageText: "카카오예약하기" }
                ]
              }}
            ]
          }
        })
      });
      return;
    }

    // 네이버 예약 클릭 감지
    if (userMessage === "네이버예약클릭") {
      const lang = session.data.lang || "ko";
      const naverUrl = process.env.NAVER_BOOKING_URL || "https://booking.naver.com";
      // 텔레그램 알림 발송
      // Gemini로 상담내용 즉석 요약
      const userMsgsNaver = session.history.filter(h => h.role === "user").map(h => h.content).join(", ");
      let naverNote = session.data.consultNote || "";
      if (!naverNote || naverNote === "상담 내용 없음" || naverNote === "상담 후 결정") {
        try {
          const sumRes = await chat([], `다음 고객 상담 내용을 10자 이내로 핵심만 요약해줘. 예: "프락셀 예약 문의", "여드름 케어 상담". 상담내용: ${userMsgsNaver}`, false, "hospital", "ko");
          naverNote = sumRes.message?.replace(/[*#\n]/g, "").trim().substring(0, 50) || userMsgsNaver.substring(0, 50);
        } catch(e) { naverNote = userMsgsNaver.substring(0, 50) || "미입력"; }
      }
      await sendTelegram([
        "🟢 네이버 예약 클릭!",
        "━━━━━━━━━━━━━━",
        "📝 상담내용: " + naverNote,
        "🌍 언어: " + lang,
        "⏰ 시간: " + new Date().toLocaleString("ko-KR", {timeZone: "Asia/Seoul"})
      ].join("\n"));
      return;
    }

    if (userMessage === "무료체험신청") {
      await sendCallback(callbackUrl,
        '🎁 부킷 무료체험 신청 안내\n\n전화번호를 남겨주시면 담당자가 직접 연락드리겠습니다 😊\n\n📞 전화번호를 입력해주세요',
        [{ label: '🏠 처음으로', action: 'message', messageText: '처음으로' }]
      );
      session.data.waitingFor = 'freeTrialPhone';
      return;
    }

    if (session.data.waitingFor === 'freeTrialPhone') {
      const phone = userMessage.trim().replace(/[\s\-]/g, '');
      const phoneRegex = /^01[0-9]{8,9}$/;
      if (!phoneRegex.test(phone)) {
        await sendCallback(callbackUrl,
          '📞 올바른 전화번호 형식으로 입력해주세요\n\n예시: 010-1234-5678',
          [{ label: '🏠 처음으로', action: 'message', messageText: '처음으로' }]
        );
        return;
      }
      session.data.waitingFor = null;
      await sendTelegram([
        '🎁 무료체험 신청!',
        '━━━━━━━━━━━━━━',
        '📞 전화번호: ' + phone,
        '⏰ 시간: ' + new Date().toLocaleString('ko-KR', {timeZone: 'Asia/Seoul'})
      ].join('\n'));
      await sendCallback(callbackUrl,
        '✅ 신청이 완료됐습니다!\n\n담당자가 빠르게 연락드리겠습니다 😊',
        [{ label: '🏠 처음으로', action: 'message', messageText: '처음으로' }]
      );
      return;
    }

    if (userMessage === "카카오예약하기") {
      const serviceNames = {
        ko: session.data.service || '시술',
        en: session.data.service || 'Treatment',
        zh: session.data.service || '治疗',
        ja: session.data.service || '施術',
        th: session.data.service || 'การรักษา',
        vi: session.data.service || 'Điều trị',
        ar: session.data.service || 'العلاج',
        ru: session.data.service || 'Процедура',
        fr: session.data.service || 'Soin',
        es: session.data.service || 'Tratamiento'
      };
      const serviceName = serviceNames[session.data.lang || 'ko'];
      const cl = {
        ko: { msg: `${serviceName} 예약을 진행할게요! 😊\n\n날짜와 시간을 선택해주세요!`, title: "📅 날짜/시간 선택", desc: "아래 버튼을 눌러 날짜와 시간을 선택해주세요!", btn1: "📅 날짜/시간 선택하기", btn2: "✅ 날짜선택완료" },
        en: { msg: `Proceeding with ${serviceName} booking! 😊\n\nPlease select a date and time!`, title: "📅 Select Date/Time", desc: "Tap the button below to select!", btn1: "📅 Select Date/Time", btn2: "✅ Done" },
        zh: { msg: `正在预约${serviceName}！ 😊\n\n请选择日期和时间！`, title: "📅 选择日期/时间", desc: "请点击下方按钮！", btn1: "📅 选择日期/时间", btn2: "✅ 完成" },
        ja: { msg: `${session.data.service}のご予約を進めます！ 😊\n\n日付と時間をお選びください！`, title: "📅 日付/時間を選択", desc: "下のボタンを押してください！", btn1: "📅 日付/時間を選択", btn2: "✅ 選択完了" },
        th: { msg: `กำลังดำเนินการจอง ${session.data.service}! 😊\n\nกรุณาเลือกวันและเวลา!`, title: "📅 เลือกวันและเวลา", desc: "กดปุ่มด้านล่าง!", btn1: "📅 เลือกวันและเวลา", btn2: "✅ เสร็จสิ้น" },
        vi: { msg: `Đang tiến hành đặt lịch ${session.data.service}! 😊\n\nVui lòng chọn ngày và giờ!`, title: "📅 Chọn ngày/giờ", desc: "Nhấn nút bên dưới!", btn1: "📅 Chọn ngày/giờ", btn2: "✅ Hoàn thành" },
        ar: { msg: `جارٍ حجز ${session.data.service}! 😊\n\nيرجى اختيار التاريخ والوقت!`, title: "📅 اختر التاريخ/الوقت", desc: "اضغط الزر أدناه!", btn1: "📅 اختر التاريخ/الوقت", btn2: "✅ تم" },
        ru: { msg: `Оформляем запись ${session.data.service}! 😊\n\nВыберите дату и время!`, title: "📅 Выбор даты/времени", desc: "Нажмите кнопку ниже!", btn1: "📅 Выбрать дату/время", btn2: "✅ Готово" },
        fr: { msg: `Réservation ${session.data.service} en cours! 😊\n\nVeuillez sélectionner une date et une heure!`, title: "📅 Sélectionner date/heure", desc: "Appuyez sur le bouton ci-dessous!", btn1: "📅 Sélectionner date/heure", btn2: "✅ Terminé" },
        es: { msg: `Procesando reserva de ${session.data.service}! 😊\n\n¡Por favor seleccione fecha y hora!`, title: "📅 Seleccionar fecha/hora", desc: "¡Toca el botón de abajo!", btn1: "📅 Seleccionar fecha/hora", btn2: "✅ Listo" }
      };
      const c = cl[session.data.lang] || cl.ko;
      await fetch(callbackUrl, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          version: "2.0",
          template: {
            outputs: [
              { simpleText: { text: c.msg } },
              { basicCard: {
                title: c.title,
                description: c.desc,
                buttons: [
                  { action: "webLink", label: c.btn1, webLinkUrl: `${BASE_URL}/calendar.html?userId=${kakaoUserId}&lang=${session.data.lang || "ko"}` },
                  { action: "message", label: c.btn2, messageText: "날짜선택완료" }
                ]
              }}
            ]
          }
        })
      });
      return;
    }

        if (userMessage === '가격안내') {
      await sendPriceMenu(callbackUrl, session.data.lang || 'ko');
      return;
    }

    if (userMessage === '오시는길') {
      const lang = session.data.lang || 'ko';
      const lt = LANG_TEXTS[lang] || LANG_TEXTS.ko;
      const dirTexts = {
        ko: '📍 연세푸르미피부과 오시는 길\n\n📌 서울 강남구 강남대로 123 푸르미빌딩 5층\n\n🚇 강남역 2번 출구 도보 3분\n🚗 건물 내 주차 1시간 무료\n📞 02-1234-5678',
        en: '📍 Directions to Yonsei Purmi Dermatology\n\n📌 5F Purmi Bldg, 123 Gangnam-daero, Gangnam-gu, Seoul\n\n🚇 3 min walk from Gangnam Station Exit 2\n🚗 1 hour free parking\n📞 02-1234-5678',
        zh: '📍 前往延世普尔美皮肤科\n\n📌 首尔江南区江南大路123号普尔美大厦5楼\n\n🚇 江南站2号出口步行3分钟\n🚗 楼内停车1小时免费\n📞 02-1234-5678',
        ja: '📍 延世プルミ皮膚科へのアクセス\n\n📌 ソウル江南区江南大路123 プルミビル5階\n\n🚇 江南駅2番出口から徒歩3分\n🚗 館内駐車場1時間無料\n📞 02-1234-5678',
        th: '📍 เส้นทางไป Yonsei Purmi Dermatology\n\n📌 ชั้น 5 Purmi Bldg, 123 Gangnam-daero, Seoul\n\n🚇 เดิน 3 นาทีจากทางออก 2 สถานี Gangnam\n🚗 จอดรถฟรี 1 ชั่วโมง\n📞 02-1234-5678',
        vi: '📍 Đường đến Yonsei Purmi Dermatology\n\n📌 Tầng 5, Tòa nhà Purmi, 123 Gangnam-daero, Seoul\n\n🚇 Đi bộ 3 phút từ cửa số 2 ga Gangnam\n🚗 Đậu xe miễn phí 1 giờ\n📞 02-1234-5678',
        ar: '📍 الاتجاهات إلى عيادة يونسي بورومي\n\n📌 الطابق 5، مبنى بورومي، 123 شارع غانغنام، سيول\n\n🚇 3 دقائق سيرًا من مخرج 2 محطة غانغنام\n🚗 ساعة واحدة مجانية للانتظار\n📞 02-1234-5678',
        ru: '📍 Как добраться до Yonsei Purmi Dermatology\n\n📌 5 этаж, здание Purmi, 123 Gangnam-daero, Сеул\n\n🚇 3 минуты пешком от выхода 2 станции Gangnam\n🚗 Бесплатная парковка 1 час\n📞 02-1234-5678',
        fr: '📍 Comment se rendre à Yonsei Purmi Dermatology\n\n📌 5ème étage, Purmi Bldg, 123 Gangnam-daero, Séoul\n\n🚇 3 min à pied de la sortie 2 de la station Gangnam\n🚗 1 heure de stationnement gratuit\n📞 02-1234-5678',
        es: '📍 Cómo llegar a Yonsei Purmi Dermatology\n\n📌 Piso 5, Purmi Bldg, 123 Gangnam-daero, Seúl\n\n🚇 3 min a pie desde la salida 2 de la estación Gangnam\n🚗 1 hora de estacionamiento gratuito\n📞 02-1234-5678'
      };
      const mapLabels = {
        ko: '🗺️ 카카오맵 보기', en: '🗺️ View on Map', zh: '🗺️ 查看地图',
        ja: '🗺️ 地図を見る', th: '🗺️ ดูแผนที่', vi: '🗺️ Xem bản đồ',
        ar: '🗺️ عرض الخريطة', ru: '🗺️ Открыть карту', fr: '🗺️ Voir la carte', es: '🗺️ Ver mapa'
      };
      await sendCallback(callbackUrl,
        dirTexts[lang] || dirTexts.ko,
        getQuickReplies(lang, session.industry || 'hospital'),
        [
          { action: 'webLink', label: mapLabels[lang] || mapLabels.ko, webLinkUrl: 'https://map.kakao.com/?q=강남역피부과' },
          { action: 'message', label: lt.home, messageText: '처음으로' }
        ]
      );
      return;
    }

    if (userMessage === '진료시간') {
      const lang = session.data.lang || 'ko';
      const lt = LANG_TEXTS[lang] || LANG_TEXTS.ko;
      const hoursTexts = {
        ko: "⏰ 진료시간 안내\n\n월~금: 09:00 - 18:00\n토요일: 09:00 - 15:00\n일/공휴일: 휴진\n\n점심시간: 13:00 - 14:00\n\n📞 전화예약: 02-1234-5678",
        en: "⏰ Business Hours\n\nMon-Fri: 09:00 - 18:00\nSaturday: 09:00 - 15:00\nSun/Holidays: Closed\n\nLunch: 13:00 - 14:00\n\n📞 Phone: 02-1234-5678",
        zh: "⏰ 营业时间\n\n周一至周五: 09:00 - 18:00\n周六: 09:00 - 15:00\n周日/节假日: 休息\n\n午休: 13:00 - 14:00\n\n📞 电话: 02-1234-5678",
        ja: "⏰ 診療時間\n\n月〜金: 09:00 - 18:00\n土曜日: 09:00 - 15:00\n日/祝日: 休診\n\nランチ: 13:00 - 14:00\n\n📞 電話: 02-1234-5678",
        th: "⏰ เวลาทำการ\n\nจ-ศ: 09:00 - 18:00\nเสาร์: 09:00 - 15:00\nอาทิตย์/วันหยุด: ปิด\n\nพักกลางวัน: 13:00 - 14:00\n\n📞 โทร: 02-1234-5678",
        vi: "⏰ Giờ làm việc\n\nT2-T6: 09:00 - 18:00\nThứ 7: 09:00 - 15:00\nCN/Lễ: Nghỉ\n\nNghỉ trưa: 13:00 - 14:00\n\n📞 Điện thoại: 02-1234-5678",
        ar: "⏰ ساعات العمل\n\nإثنين-جمعة: 09:00 - 18:00\nالسبت: 09:00 - 15:00\nأحد/عطلات: مغلق\n\nاستراحة الغداء: 13:00 - 14:00\n\n📞 هاتف: 02-1234-5678",
        ru: "⏰ Часы работы\n\nПн-Пт: 09:00 - 18:00\nСуббота: 09:00 - 15:00\nВс/праздники: Закрыто\n\nОбед: 13:00 - 14:00\n\n📞 Телефон: 02-1234-5678",
        fr: "⏰ Heures d'ouverture\n\nLun-Ven: 09:00 - 18:00\nSamedi: 09:00 - 15:00\nDim/Fériés: Fermé\n\nDéjeuner: 13:00 - 14:00\n\n📞 Tél: 02-1234-5678",
        es: "⏰ Horario\n\nLun-Vie: 09:00 - 18:00\nSábado: 09:00 - 15:00\nDom/Festivos: Cerrado\n\nAlmuerzo: 13:00 - 14:00\n\n📞 Tel: 02-1234-5678"
      };
      await sendCallback(callbackUrl, hoursTexts[lang] || hoursTexts.ko,
        getQuickReplies(lang, session.industry || 'hospital'),
        [{ action: "message", label: lt.home, messageText: "처음으로" }]
      );
      return;
    }

    // 의사 상세 소개 처리
    // 가격 상세 소개 처리
    if (userMessage.startsWith('가격소개:')) {
      const itemName = userMessage.replace('가격소개:', '').trim();
      const lang = session.data.lang || 'ko';
      const question = lang === 'ko' ? `${itemName} 가격과 상세 정보를 알려주세요` : `Please provide price and details for ${itemName}`;
      session.history.push({ role: 'user', content: question });
      const geminiRes = await chat(session.history, question, true, session.industry || 'hospital', lang);
      await sendCallback(callbackUrl, geminiRes.message,
        [{ label: '🏠 처음으로', action: 'message', messageText: '처음으로' }]);
      return;
    }

    if (userMessage.startsWith('의사소개:')) {
      const doctorName = userMessage.replace('의사소개:', '').trim();
      const lang = session.data.lang || 'ko';
      const question = lang === 'ko' ? `${doctorName}에 대해 자세히 소개해주세요` : `Please introduce ${doctorName} in detail`;
      session.history.push({ role: 'user', content: question });
      const geminiRes = await chat(session.history, question, true, session.industry || 'hospital', lang);
      await sendCallback(callbackUrl, geminiRes.message,
        [{ label: '🏠 처음으로', action: 'message', messageText: '처음으로' }]);
      return;
    }

    if (userMessage === '의료진보기') {
      await showDoctors(callbackUrl, session.data.lang || 'ko');
      return;
    }

    if (userMessage === '날짜선택완료') {
      const lt = LANG_TEXTS[session.data.lang] || LANG_TEXTS.ko;
      try {
        const r = await fetch(`http://localhost:3002/calendar-result/${kakaoUserId}`);
        const data = await r.json();
        if (!data.success || !data.datetime) {
          await sendCallback(callbackUrl, lt.calError,
            [{ label: lt.calRetry, action: "message", messageText: "날짜선택완료" }]
          );
          return;
        }
        session.data.date = data.datetime;
        session.waitingFor = 'name';
        const dateMsg = lt.dateSelected(data.datetime);
        session.history.push({ role: "user", content: `날짜 ${data.datetime} 선택` });
        session.history.push({ role: "model", content: dateMsg });
        await sendCallback(callbackUrl, dateMsg, [{ label: lt.home, action: "message", messageText: "처음으로" }]);
      } catch(e) {
        await sendCallback(callbackUrl, lt.error);
      }
      return;
    }

    // 이름 대기 상태 처리
    if (session.waitingFor === 'name') {
      session.data.name = userMessage.trim();
      session.waitingFor = 'privacy';
      const lang = session.data.lang || 'ko';
      const phoneMsgs = {
        ko: '📋 개인정보 수집 및 이용에 동의하십니까?\n\n수집항목: 성명, 연락처\n수집목적: 예약 확인 및 안내\n보유기간: 예약 완료 후 1년',
        en: '📋 Do you agree to the collection and use of personal information?\n\nItems: Name, Phone\nPurpose: Reservation confirmation\nRetention: 1 year after reservation',
        zh: '📋 您是否同意收集和使用个人信息?\n\n收集项目: 姓名, 电话\n收集目的: 预约确认\n保留期限: 预约完成后1年',
        ja: '📋 個人情報の収集・利用に同意しますか?\n\n収集項目: 氏名, 電話番号\n収集目的: 予約確認\n保有期間: 予約完了後1年',
        th: '📞 กรุณากรอกหมายเลขโทรศัพท์ 😊\n(ไม่บังคับ - พิมพ์ "ข้าม" เพื่อข้าม)',
        vi: '📞 Vui lòng nhập số điện thoại 😊\n(Tùy chọn - gõ "bỏ qua" để bỏ qua)',
        ar: '📞 يرجى إدخال رقم هاتفك 😊\n(اختياري - اكتب "تخطي" للتخطي)',
        ru: '📞 Введите номер телефона 😊\n(Необязательно - введите "пропустить" для пропуска)',
        fr: '📞 Veuillez entrer votre numéro de téléphone 😊\n(Optionnel - tapez "passer" pour ignorer)',
        es: '📞 Por favor ingrese su número de teléfono 😊\n(Opcional - escriba "omitir" para omitir)'
      };
      await sendCallback(callbackUrl, phoneMsgs[lang] || phoneMsgs.ko, [
        { label: '✅ 동의', action: 'message', messageText: '동의' },
        { label: '❌ 비동의', action: 'message', messageText: '비동의' }
      ]);
      return;
    }

    // 전화번호 대기 상태 처리
      // service가 없으면 대화 history에서 추출 시도
      // Gemini로 상담내용 요약
      const userMsgs = session.history.filter(h => h.role === "user").map(h => h.content).join(", ");
      try {
        const summaryRes = await chat([], `다음 고객 상담 내용을 10자 이내로 핵심만 요약해줘. 예: "입주위 가려움 전문의 문의", "코 여드름 케어 예약", "보톡스 가격 문의". 상담내용: ${userMsgs}`, false, "hospital", "ko");
        session.data.consultNote = summaryRes.message?.replace(/[*#\n]/g, "").trim().substring(0, 50) || userMsgs.substring(0, 50);
      } catch(e) { session.data.consultNote = userMsgs.substring(0, 50) || "상담 후 결정"; }
    if (session.waitingFor === 'privacy') {
      const lang = session.data.lang || 'ko';
      const agreeWords = ['동의', '✅', 'yes', 'agree', '同意', 'はい', 'ใช่', 'có', 'نعم', 'да', 'oui', 'sí'];
      const disagreeWords = ['비동의', '❌', 'no', 'disagree', '不同意', 'いいえ', 'ไม่', 'không', 'لا', 'нет', 'non', 'no'];
      if (disagreeWords.some(w => userMessage.trim().toLowerCase().includes(w))) {
        session.waitingFor = null;
        session.booted = true;
        await sendCallback(callbackUrl, lang === 'ko' ? '❌ 동의하지 않으셨습니다.\n전화번호 없이 예약을 접수할게요.' : 'Reservation submitted without phone number.',
          [{ label: '🏠 처음으로', action: 'message', messageText: '처음으로' }]);
        // 전화번호 없이 예약 확정
        const d = session.data;
        const confirmMsgs = {
          ko: `✅ 예약이 접수되었습니다!\n\n👤 이름: ${d.name}\n💉 시술: ${d.service || '상담 후 결정'}\n📅 일시: ${d.date}\n\n곧 확인 연락드리겠습니다 😊`,
          en: `✅ Reservation received!\n\n👤 Name: ${d.name}\n📝 Note: ${d.consultNote || d.service || 'TBD'}\n📅 Date: ${d.date}\n\nWe will contact you shortly 😊`
        };
        await sendTelegram(`📋 새 예약!\n👤 ${d.name}\n📞 전화: 미동의\n📝 ${d.consultNote || d.service || '상담 후 결정'}\n📅 ${d.date}`);
        await sendCallback(callbackUrl, confirmMsgs[lang] || confirmMsgs.ko,
          [{ label: '🏠 처음으로', action: 'message', messageText: '처음으로' }]);
        return;
      }
      // 동의한 경우 전화번호 요청
      session.waitingFor = 'phone';
      const phoneMsgs2 = {
        ko: '📞 연락처를 알려주세요 😊',
        en: '📞 Please enter your phone number 😊',
        zh: '📞 请输入您的电话号码 😊',
        ja: '📞 電話番号を入力してください 😊'
      };
      await sendCallback(callbackUrl, phoneMsgs2[lang] || phoneMsgs2.ko);
      return;
    }

    if (session.waitingFor === 'phone') {
      const lang = session.data.lang || 'ko';
      const skipWords = ['건너뛰기', 'skip', '跳过', 'スキップ', 'ข้าม', 'bỏ qua', 'تخطي', 'пропустить', 'passer', 'omitir'];
      if (!skipWords.includes(userMessage.trim().toLowerCase())) {
        session.data.phone = userMessage.trim();
      }
      session.waitingFor = null;
      session.booted = true;
      const d = session.data;
      const confirmMsgs = {
        ko: `✅ 예약이 접수되었습니다!\n\n👤 이름: ${d.name}\n📞 전화: ${d.phone || '미입력'}\n📝 상담내용: ${d.consultNote || d.service || '미입력'}\n📅 일시: ${d.date}\n\n곧 확인 연락드리겠습니다 😊`,
        en: `✅ Reservation received!\n\n👤 Name: ${d.name}\n📞 Phone: ${d.phone || 'Not provided'}\n📝 Note: ${d.consultNote || d.service || 'TBD'}\n📅 Date: ${d.date}\n\nWe will contact you shortly 😊`,
        zh: `✅ 预约已提交！\n\n👤 姓名: ${d.name}\n📞 电话: ${d.phone || '未填写'}\n📝 咨询内容: ${d.consultNote || d.service || '待定'}\n📅 日期: ${d.date}\n\n我们会尽快联系您 😊`,
        ja: `✅ ご予約を受け付けました！\n\n👤 お名前: ${d.name}\n📞 電話: ${d.phone || '未入力'}\n📝 相談内容: ${d.consultNote || d.service || '未定'}\n📅 日時: ${d.date}\n\nまもなくご連絡いたします 😊`
      };
      await sendCallback(callbackUrl, confirmMsgs[lang] || confirmMsgs.ko,
        [{ label: lang === 'ko' ? '🏠 처음으로' : '🏠 Home', action: 'message', messageText: '처음으로' }]
      );
      await sendTelegram(`📋 새 예약!\n👤 이름: ${d.name}\n📞 전화: ${d.phone || '미입력'}\n📝 상담내용: ${d.consultNote || d.service || '미입력'}\n📅 일시: ${d.date}\n🌍 언어: ${lang}`);
      return;
    }

    console.log('🌍 언어값:', session.data.lang, '/ 사용언어:', session.data.lang || 'ko');
    let geminiReply;
    try {
      geminiReply = await chat(session.history, userMessage, session.booted, session.industry || 'hospital', session.data.lang || 'ko');
      console.log('✅ Gemini 응답:', JSON.stringify(geminiReply).substring(0, 100));
      // 금지 문구 강제 제거
      if (geminiReply.message) {
        geminiReply.message = geminiReply.message
          .replace(/새로 예약하시겠어요\?/g, '')
          .replace(/새로운 예약을 도와드릴까요\?/g, '')
          .replace(/다른 예약을 도와드릴까요\?/g, '')
          .replace(/^예약을 도와드릴까요\?/gm, '')
          .replace(/Would you like to make a new booking\?/gi, '')
          .replace(/Would you like to book again\?/gi, '')
          .replace(/새로 예약.*?\?/g, '')
          .trim();
      }
    } catch(e) {
      console.error('❌ Gemini 오류:', e.message);
      await sendCallback(callbackUrl, '잠시 오류가 발생했습니다. 다시 시도해주세요 😊');
      return;
    }
    session.history.push({ role: "user", content: userMessage });
    session.history.push({ role: "model", content: geminiReply.message });
    if (session.history.length > 10) session.history = session.history.slice(-10);

    if (geminiReply.showDoctors) {
      await showDoctors(callbackUrl, session.data.lang || 'ko', geminiReply.message);
      return;
    }
    if (geminiReply.showPrice) {
      if (geminiReply.message) await sendCallback(callbackUrl, geminiReply.message);
      await sendPriceMenu(callbackUrl, session.data.lang || 'ko');
      return;
    }
    if (geminiReply.showCalendar) {
      if (geminiReply.message) await sendCallback(callbackUrl, geminiReply.message);
      await sendBookingMenu(callbackUrl, kakaoUserId, session.data.lang || 'ko');
      return;
    }
    // 가격/설명 문의 시 showBookingType 강제 무시
    const priceKeywords = ['얼마', '가격', '요금', '비용', '금액', '할인', '패키지', '코스', '설명', '어떤', '뭐야', '뭔가요', '알려줘', '알려주세요', '어떻게', '소개', 'price', 'cost', 'how much', 'what is'];
    const isPriceQuery = priceKeywords.some(k => userMessage.includes(k));
    if (isPriceQuery && geminiReply.showBookingType) {
      console.log('⚠️ 가격/설명 문의로 showBookingType 무시:', userMessage);
      geminiReply.showBookingType = false;
    }

    if (geminiReply.showBookingType) {
      const lang = session.data.lang || 'ko';
      const bl = bookingTypeLabels[lang] || bookingTypeLabels.ko;
      session.contactRequested = true;
      const contactMsgs = {
        ko: '📞 예약 전 간단한 상담이 필요하시면 전화번호를 남겨주세요. 담당자가 직접 연락드려 최적의 시술과 일정을 안내해 드립니다 😊',
        en: '📞 Leave your phone number and our staff will confirm your reservation directly 😊 (Optional)',
        zh: '📞 留下您的电话号码，工作人员将直接为您确认预约 😊（可选）',
        ja: '📞 電話番号をお知らせいただければ、担当者が直接予約を確定いたします 😊（任意）',
        th: '📞 ฝากเบอร์โทรศัพท์ไว้ เจ้าหน้าที่จะยืนยันการจองให้คุณโดยตรง 😊 (ไม่บังคับ)',
        vi: '📞 Để lại số điện thoại, nhân viên sẽ xác nhận đặt lịch trực tiếp cho bạn 😊 (Tùy chọn)',
        ar: '📞 اترك رقم هاتفك وسيقوم موظفونا بتأكيد حجزك مباشرة 😊 (اختياري)',
        ru: '📞 Оставьте номер телефона, и сотрудник подтвердит вашу запись напрямую 😊 (Необязательно)',
        fr: '📞 Laissez votre numéro et notre équipe confirmera votre réservation directement 😊 (Optionnel)',
        es: '📞 Deje su número y nuestro personal confirmará su reserva directamente 😊 (Opcional)'
      };
      const contactMsg = contactMsgs[lang] || contactMsgs.ko;
      // 텔레그램 알림은 예약 완료 후 발송
      await fetch(callbackUrl, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          version: "2.0",
          template: {
            outputs: [
              { simpleText: { text: contactMsg } },
              {
                basicCard: {
                  title: bl.title,
                  description: bl.desc,
                  buttons: [
                    { action: "message", label: bl.naver, messageText: "네이버예약클릭" },
                    { action: "message", label: bl.kakao, messageText: "카카오예약하기" }
                  ]
                }
              }
            ]
          }
        })
      });
      return;
    }
    if (geminiReply.humanAgentRequest) {
      await sendTelegram(`🚨 상담원 요청!\n"${userMessage}"`);
    }
    if (geminiReply.reset) {
      session.history = []; session.data = {}; session.booted = true;
      await showWelcome(callbackUrl); return;
    }
    if (geminiReply.bookingData) {
      const d = geminiReply.bookingData;
      // Gemini가 인식한 service를 session에 저장
      if (d.service) session.data.service = d.service;
      if (d.name) session.data.name = d.name;
      if (d.phone) session.data.phone = d.phone;
      if (d.name && d.phone && d.service && d.date && d.time) {
        await sendTelegram(`📋 새 예약!\n👤 ${d.name}\n📞 ${d.phone}\n💉 ${d.service}\n📅 ${d.date} ${d.time}`);
        session.booted = true;
      }
    }

    const lt2 = LANG_TEXTS[session.data.lang] || LANG_TEXTS.ko;
    await sendCallback(callbackUrl, geminiReply.message,
      [
        { label: '🎁 무료체험 신청', action: 'message', messageText: '무료체험신청' },
        { label: lt2.home, action: "message", messageText: "처음으로" }
      ]
    );

  } catch(err) {
    console.error('❌ 전체오류:', err.message);
    console.error(err.stack);
    const ltErr = LANG_TEXTS[session.data.lang] || LANG_TEXTS.ko;
    try { await sendCallback(callbackUrl, ltErr.error); } catch(e2) { console.error('❌ 콜백 응답도 실패:', e2.message); }
  }
}

async function showWelcome(callbackUrl, lang = 'ko', industry = 'hospital') {
  console.log('showWelcome 시작');
  try {
    const fs = require('fs');
    const path = require('path');
    const promptPath = path.join(__dirname, '../prompts', `${industry}.txt`);
    let bizName = industry;
    let bizDesc = '';
    let welcomeMsg = '';
    try {
      const promptText = fs.readFileSync(promptPath, 'utf-8');
      const nameMatch = promptText.match(/- 상호:\s*(.+)/);
      if (nameMatch) bizName = nameMatch[1].trim();
      const locMatch = promptText.match(/- 위치:\s*(.+)/);
      if (locMatch) bizDesc = locMatch[1].trim();
      const welcomeMatch = promptText.match(/## 환영 메시지\n([\s\S]*?)(?=\n##|$)/);
      if (welcomeMatch) welcomeMsg = welcomeMatch[1].trim();
    } catch(e) {
      console.error('프롬프트 읽기 오류:', e.message);
    }
    const bannerUrl = `${BASE_URL}/banner_${industry}.jpg`;
    const welcomeMsgs = {
      ko: welcomeMsg || `안녕하세요! ${bizName}입니다 😊\n\n무엇을 도와드릴까요?\n\n💬 아래 버튼을 누르시거나 사람에게 말하듯 자연스럽게 대화해 보세요!`,
      en: `Hello! Welcome to ${bizName} 😊\n\nHow can we help you today?\n\n💬 Tap a button below or just chat naturally!`,
      zh: `您好！欢迎来到${bizName} 😊\n\n请问有什么可以帮您？\n\n💬 点击下方按钮或像和朋友聊天一样自然交流吧！`,
      ja: `こんにちは！${bizName}へようこそ 😊\n\nどのようなご用件でしょうか？\n\n💬 下のボタンを押すか、自然に話しかけてください！`,
      th: `สวัสดี! ยินดีต้อนรับสู่${bizName} 😊\n\nเราช่วยอะไรคุณได้บ้าง?\n\n💬 กดปุ่มด้านล่างหรือพูดคุยได้เลย!`,
      vi: `Xin chào! Chào mừng đến với ${bizName} 😊\n\nChúng tôi có thể giúp gì?\n\n💬 Nhấn nút bên dưới hoặc trò chuyện tự nhiên nhé!`,
      ar: `مرحباً! أهلاً بكم في ${bizName} 😊\n\nكيف يمكننا مساعدتك؟\n\n💬 اضغط على الأزرار أدناه أو تحدث بشكل طبيعي!`,
      ru: `Здравствуйте! Добро пожаловать в ${bizName} 😊\n\nЧем мы можем помочь?\n\n💬 Нажмите кнопку ниже или просто напишите нам!`,
      fr: `Bonjour! Bienvenue chez ${bizName} 😊\n\nComment pouvons-nous vous aider?\n\n💬 Appuyez sur un bouton ou discutez naturellement!`,
      es: `¡Hola! Bienvenido a ${bizName} 😊\n\n¿En qué podemos ayudarte?\n\n💬 Toca un botón o chatea de forma natural!`
    };
    const payload = {
      version: '2.0',
      template: {
        outputs: [
          { basicCard: {
            title: `✨ ${bizName}`,
            description: bizDesc,
            thumbnail: { imageUrl: bannerUrl, fixedRatio: false }
          }},
          { simpleText: { text: welcomeMsgs[lang] || welcomeMsgs.ko } }
        ],
        quickReplies: getQuickReplies(lang, industry)
      }
    };
    const res = await fetch(callbackUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });
    const resText = await res.text();
    console.log('showWelcome 응답:', res.status, resText);
  } catch(e) {
    console.error('showWelcome 오류:', e.message);
  }
}

async function sendBookingMenu(callbackUrl, kakaoUserId, lang = 'ko') {
  console.log('sendBookingMenu 시작, 언어:', lang);
  try {
    const industry = 'hospital';
    const items = parseCardSection(industry, '카드_예약메뉴', lang);
    const labels = {
      ko: { text: '📅 시술 종류를 둘러보세요!\n궁금한 시술을 눌러 자세한 정보를 확인하세요 😊', btn: '예약하기', home: '🏠 처음으로' },
      en: { text: '📅 Which treatment would you like to book?\nPlease select a treatment!', btn: 'Book', home: '🏠 Home' },
      zh: { text: '📅 您想预约哪种治疗?\n请选择您需要的治疗!', btn: '预约', home: '🏠 首页' },
      ja: { text: '📅 どの施術をご予約されますか?\nご希望の施術をお選びください!', btn: '予約する', home: '🏠 ホーム' },
      th: { text: '📅 คุณต้องการนัดหมายการรักษาอะไร?\nกรุณาเลือกการรักษา!', btn: 'จอง', home: '🏠 หน้าหลัก' },
      vi: { text: '📅 Bạn muốn đặt lịch điều trị gì?\nVui lòng chọn dịch vụ!', btn: 'Đặt lịch', home: '🏠 Trang chủ' },
      ar: { text: '📅 ما العلاج الذي تريد حجزه?\nالرجاء اختيار العلاج!', btn: 'احجز', home: '🏠 الرئيسية' },
      ru: { text: '📅 Какую процедуру вы хотите записаться?\nПожалуйста, выберите процедуру!', btn: 'Записаться', home: '🏠 Главная' },
      fr: { text: '📅 Quel soin souhaitez-vous réserver?\nVeuillez sélectionner un soin!', btn: 'Réserver', home: '🏠 Accueil' },
      es: { text: '📅 ¿Qué tratamiento desea reservar?\nPor favor seleccione un tratamiento!', btn: 'Reservar', home: '🏠 Inicio' }
    };
    const l = labels[lang] || labels.ko;
    const cardItems = items.length > 0 ? items : [
      { title: '💉 시술 예약', desc: '전문의 상담 후 시술 결정', msg: '시술 예약하기' }
    ];
    const payload = {
      version: '2.0',
      template: {
        outputs: [
          { simpleText: { text: l.text } },
          { carousel: {
            type: 'basicCard',
            items: cardItems.map(i => ({
              title: i.title,
              description: i.desc,
              buttons: [{ action: 'message', label: '🔍 자세히 알아보기', messageText: i.title + ' 설명해줘' }]
            }))
          }}
        ],
        quickReplies: [
          { label: '🎁 무료체험 신청', action: 'message', messageText: '무료체험신청' },
          { label: l.home, action: 'message', messageText: '처음으로' }
        ]
      }
    };
    const res = await fetch(callbackUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });
    const resText = await res.text();
    console.log('sendBookingMenu 응답:', res.status, resText);
  } catch(e) {
    console.error('sendBookingMenu 오류:', e.message);
  }
}

async function sendConsultMenu(callbackUrl, lang = 'ko') {
  console.log('sendConsultMenu 시작, 언어:', lang);
  try {
    const industry = 'hospital';
    const items = parseCardSection(industry, '카드_상담메뉴', lang);
    const labels = {
      ko: { text: '💬 어떤 피부 고민이 있으신가요?\n아래에서 선택하시거나 직접 입력해주세요!', btn: '상담하기', home: '🏠 처음으로', price: '💰 가격안내', priceMsg: '가격안내' },
      en: { text: '💬 What is your skin concern?\nPlease select or type directly!', btn: 'Consult', home: '🏠 Home', price: '💰 Prices', priceMsg: '가격안내' },
      zh: { text: '💬 您有什么皮肤问题?\n请选择或直接输入!', btn: '咨询', home: '🏠 首页', price: '💰 价格', priceMsg: '가격안내' },
      ja: { text: '💬 お肌のお悩みは何ですか?\n下記から選択またはご入力ください!', btn: '相談する', home: '🏠 ホーム', price: '💰 料金', priceMsg: '가격안내' },
      th: { text: '💬 คุณมีปัญหาผิวอะไร?\nเลือกหรือพิมพ์ได้เลย!', btn: 'ปรึกษา', home: '🏠 หน้าหลัก', price: '💰 ราคา', priceMsg: '가격안내' },
      vi: { text: '💬 Bạn có vấn đề về da gì?\nHãy chọn hoặc nhập trực tiếp!', btn: 'Tư vấn', home: '🏠 Trang chủ', price: '💰 Giá', priceMsg: '가격안내' },
      ar: { text: '💬 ما هي مشكلة بشرتك?\nالرجاء الاختيار أو الكتابة مباشرة!', btn: 'استشارة', home: '🏠 الرئيسية', price: '💰 الأسعار', priceMsg: '가격안내' },
      ru: { text: '💬 Какая у вас проблема с кожей?\nВыберите или напишите напрямую!', btn: 'Консультация', home: '🏠 Главная', price: '💰 Цены', priceMsg: '가격안내' },
      fr: { text: '💬 Quel est votre problème de peau?\nVeuillez sélectionner ou saisir directement!', btn: 'Consulter', home: '🏠 Accueil', price: '💰 Tarifs', priceMsg: '가격안내' },
      es: { text: '💬 ¿Cuál es su problema de piel?\n¡Selecciona o escribe directamente!', btn: 'Consultar', home: '🏠 Inicio', price: '💰 Precios', priceMsg: '가격안내' }
    };
    const l = labels[lang] || labels.ko;
    const cardItems = items.length > 0 ? items : [
      { title: '💬 피부 상담', desc: '전문의 1:1 상담', msg: '피부 상담해주세요' }
    ];
    const payload = {
      version: '2.0',
      template: {
        outputs: [
          { simpleText: { text: l.text } },
          { carousel: {
            type: 'basicCard',
            items: cardItems.map(i => ({
              title: i.title,
              description: i.desc,
              buttons: [{ action: 'message', label: '🔍 자세히 알아보기', messageText: i.title + ' 설명해줘' }]
            }))
          }}
        ],
        quickReplies: [
          { label: '🎁 무료체험 신청', action: 'message', messageText: '무료체험신청' },
          { label: l.home, action: 'message', messageText: '처음으로' },
          { label: l.price, action: 'message', messageText: l.priceMsg }
        ]
      }
    };
    const res = await fetch(callbackUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });
    const resText = await res.text();
    console.log('sendConsultMenu 응답:', res.status, resText);
  } catch(e) {
    console.error('sendConsultMenu 오류:', e.message);
  }
}

async function sendPriceMenu(callbackUrl, lang) {
  lang = lang || 'ko';
  console.log('sendPriceMenu 시작, 언어:', lang);
  try {
    const industry = 'hospital';
    const items = parseCardSection(industry, '카드_가격메뉴', lang);
    const labels = {
      ko: { title: '💰 시술 가격 안내', btn: '🔍 자세히 알아보기' },
      en: { title: '💰 Treatment Prices', btn: '🔍 Learn More' },
      zh: { title: '💰 治疗价格', btn: '🔍 了解更多' },
      ja: { title: '💰 施術料金案内', btn: '🔍 詳しく見る' },
      th: { title: '💰 ราคาการรักษา', btn: '🔍 ดูเพิ่มเติม' },
      vi: { title: '💰 Bảng giá dịch vụ', btn: '🔍 Xem thêm' },
      ar: { title: '💰 أسعار العلاجات', btn: '🔍 معرفة المزيد' },
      ru: { title: '💰 Цены на процедуры', btn: '🔍 Подробнее' },
      fr: { title: '💰 Tarifs des soins', btn: '🔍 En savoir plus' },
      es: { title: '💰 Precios de tratamientos', btn: '🔍 Saber más' }
    };
    const l = labels[lang] || labels.ko;
    const cardItems = items.length > 0 ? items : [
      { title: '💰 가격 안내', desc: '가격 정보를 준비 중입니다', msg: '' }
    ];
    const payload = {
      version: '2.0',
      template: {
        outputs: [
          { simpleText: { text: l.title } },
          { carousel: {
            type: 'basicCard',
            items: cardItems.map(item => ({
              title: item.title,
              description: item.desc,
              buttons: [{ action: 'message', label: l.btn, messageText: '가격소개:' + item.title }]
            }))
          }}
        ],
        quickReplies: getQuickReplies(lang, industry)
      }
    };
    const res = await fetch(callbackUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });
    const resText = await res.text();
    console.log('sendPriceMenu 응답:', res.status, resText);
  } catch(e) {
    console.error('sendPriceMenu 오류:', e.message);
  }
}

async function showDoctors(callbackUrl, lang, prefixMessage) {
  lang = lang || 'ko';
  console.log('showDoctors 시작, 언어:', lang);
  try {
    const industry = 'hospital';
    const items = parseCardSection(industry, '카드_의료진', lang);
    const labels = {
      ko: { title: '👨‍⚕️ 의료진 소개', btn: '🔍 자세히 알아보기', home: '🏠 처음으로' },
      en: { title: '👨‍⚕️ Our Doctors', btn: '🔍 Learn More', home: '🏠 Home' },
      zh: { title: '👨‍⚕️ 医师介绍', btn: '🔍 了解更多', home: '🏠 首页' },
      ja: { title: '👨‍⚕️ 医師紹介', btn: '🔍 詳しく見る', home: '🏠 ホーム' },
      th: { title: '👨‍⚕️ แพทย์ของเรา', btn: '🔍 ดูเพิ่มเติม', home: '🏠 หน้าหลัก' },
      vi: { title: '👨‍⚕️ Bác sĩ của chúng tôi', btn: '🔍 Xem thêm', home: '🏠 Trang chủ' },
      ar: { title: '👨‍⚕️ أطباؤنا', btn: '🔍 معرفة المزيد', home: '🏠 الرئيسية' },
      ru: { title: '👨‍⚕️ Наши врачи', btn: '🔍 Подробнее', home: '🏠 Главная' },
      fr: { title: '👨‍⚕️ Nos médecins', btn: '🔍 En savoir plus', home: '🏠 Accueil' },
      es: { title: '👨‍⚕️ Nuestros médicos', btn: '🔍 Saber más', home: '🏠 Inicio' }
    };
    const l = labels[lang] || labels.ko;
    const cardItems = items.length > 0 ? items : [
      { title: '👨‍⚕️ 전문의', desc: '피부과 전문의', msg: '전문의로 예약하기', img: '' }
    ];
    const outputItems = [];
    if (prefixMessage) outputItems.push({ simpleText: { text: prefixMessage } });
    outputItems.push({ simpleText: { text: l.title } });
    const payload = {
      version: '2.0',
      template: {
        outputs: [
          ...outputItems,
          { carousel: {
            type: 'basicCard',
            items: cardItems.map(d => ({
              title: d.title,
              description: d.desc,
              thumbnail: d.img ? { imageUrl: `${BASE_URL}/${d.img}`, fixedRatio: false } : undefined,
              buttons: [{ action: 'message', label: l.btn, messageText: '의사소개:' + d.title }]
            }))
          }}
        ],
        quickReplies: [
          { label: '🎁 무료체험 신청', action: 'message', messageText: '무료체험신청' },
          { label: l.home, action: 'message', messageText: '처음으로' }
        ]
      }
    };
    const res = await fetch(callbackUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });
    const resText = await res.text();
    console.log('showDoctors 응답:', res.status, resText);
  } catch(e) {
    console.error('showDoctors 오류:', e.message);
  }
}


module.exports = router;
