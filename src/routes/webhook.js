const express = require('express');
const router = express.Router();
const fetch = (...args) => import('node-fetch').then(({default: fetch}) => fetch(...args));
const { chat } = require('../services/gemini');
require('dotenv').config();

const sessions = {};
const BASE_URL = `http://${process.env.SERVER_IP}:3002`;

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
    if (phone && session.contactRequested && !session.phone) {
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
        '🏥 시술: ' + (session.data.service || '미선택'),
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
      // 언어가 이미 선택된 경우 바로 메뉴로
      if (session.data.lang) {
        if (userMessage === "상담하기") {
          await sendConsultMenu(callbackUrl, session.data.lang);
        } else {
          await sendBookingMenu(callbackUrl, kakaoUserId, session.data.lang);
        }
        return;
      }
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
      ko: { title: "📋 예약 방법 선택", desc: "편하신 방법으로 예약해주세요!", naver: "🟢 네이버 예약", kakao: "🟡 카카오 채널 예약" },
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

    if (bookingKeywords.includes(userMessage)) {
      session.data.service = userMessage.replace(" 예약하기", "").replace("으로 예약하기", "");
      session.contactRequested = true;
      const lang = session.data.lang || 'ko';
      const bl = bookingTypeLabels[lang] || bookingTypeLabels.ko;
      const contactMsgs = {
        ko: '📞 전화번호를 남겨주시면 담당자가 직접 예약을 확정해 드립니다 😊 (선택사항)',
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
      // 텔레그램 알림
      const historyText = session.history.slice(-4).map(h => (h.role === 'user' ? '👤 ' : '🤖 ') + h.content.substring(0, 50)).join('\n');
      await sendTelegram([
        '🔔 예약 버튼 클릭!',
        '━━━━━━━━━━━━━━',
        '🏥 시술: ' + session.data.service,
        '🌍 언어: ' + lang,
        '⏰ 시간: ' + new Date().toLocaleString('ko-KR', {timeZone: 'Asia/Seoul'}),
        '━━━━━━━━━━━━━━',
        '💬 최근 상담:',
        historyText,
        '━━━━━━━━━━━━━━',
        '📞 전화번호: 대기중'
      ].join('\n'));
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
                  { action: "webLink", label: bl.naver, webLinkUrl: process.env.NAVER_BOOKING_URL || "https://booking.naver.com" },
                  { action: "message", label: bl.kakao, messageText: "카카오예약하기" }
                ]
              }}
            ]
          }
        })
      });
      return;
    }

    if (userMessage === "카카오예약하기") {
      const cl = {
        ko: { msg: `${session.data.service} 예약을 진행할게요! 😊\n\n날짜와 시간을 선택해주세요!`, title: "📅 날짜/시간 선택", desc: "아래 버튼을 눌러 날짜와 시간을 선택해주세요!", btn1: "📅 날짜/시간 선택하기", btn2: "✅ 날짜선택완료" },
        en: { msg: `Proceeding with ${session.data.service} booking! 😊\n\nPlease select a date and time!`, title: "📅 Select Date/Time", desc: "Tap the button below to select!", btn1: "📅 Select Date/Time", btn2: "✅ Done" },
        zh: { msg: `正在预约${session.data.service}！ 😊\n\n请选择日期和时间！`, title: "📅 选择日期/时间", desc: "请点击下方按钮！", btn1: "📅 选择日期/时间", btn2: "✅ 完成" },
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
        const dateMsg = lt.dateSelected(data.datetime);
        session.history.push({ role: "user", content: `날짜 ${data.datetime} 선택` });
        session.history.push({ role: "model", content: dateMsg });
        await sendCallback(callbackUrl, dateMsg, [{ label: lt.home, action: "message", messageText: "처음으로" }]);
      } catch(e) {
        await sendCallback(callbackUrl, lt.error);
      }
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
          .replace(/예약을 도와드릴까요\?/g, '')
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
    if (session.history.length > 20) session.history = session.history.slice(-20);

    if (geminiReply.showDoctors) { await showDoctors(callbackUrl, session.data.lang || 'ko'); return; }
    if (geminiReply.showPrice) { await sendPriceMenu(callbackUrl, session.data.lang || 'ko'); return; }
    if (geminiReply.showCalendar) { await sendBookingMenu(callbackUrl, kakaoUserId, session.data.lang || 'ko'); return; }
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
        ko: '📞 전화번호를 남겨주시면 담당자가 직접 예약을 확정해 드립니다 😊 (선택사항)',
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
      // 텔레그램 알림
      const historyText = session.history.slice(-4).map(h => (h.role === 'user' ? '👤 ' : '🤖 ') + h.content.substring(0, 50)).join('\n');
      await sendTelegram([
        '🔔 예약 의사 확인!',
        '━━━━━━━━━━━━━━',
        '🏢 업종: ' + (session.industry || 'hospital'),
        '🌍 언어: ' + lang,
        '⏰ 시간: ' + new Date().toLocaleString('ko-KR', {timeZone: 'Asia/Seoul'}),
        '━━━━━━━━━━━━━━',
        '💬 최근 상담:',
        historyText,
        '━━━━━━━━━━━━━━',
        '📞 전화번호: 대기중'
      ].join('\n'));
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
                    { action: "webLink", label: bl.naver, webLinkUrl: process.env.NAVER_BOOKING_URL || "https://booking.naver.com" },
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
      if (d.name && d.phone && d.service && d.date && d.time) {
        await sendTelegram(`📋 새 예약!\n👤 ${d.name}\n📞 ${d.phone}\n💉 ${d.service}\n📅 ${d.date} ${d.time}`);
        session.booted = true;
      }
    }

    const lt2 = LANG_TEXTS[session.data.lang] || LANG_TEXTS.ko;
    await sendCallback(callbackUrl, geminiReply.message,
      [{ label: lt2.home, action: "message", messageText: "처음으로" }]
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
    const bannerUrl = `${BASE_URL}/banner_hospital.jpg`;
    const welcomeTexts = {
      ko: "안녕하세요! 연세푸르미피부과입니다 😊\n\n👨‍⚕️ 피부과 전문의 3인 운영\n🏆 강남 레이저 시술 1위 병원\n🌍 외국인 다국어 상담 가능\n💡 첫 방문 고객 무료 피부 분석\n\n무엇을 도와드릴까요?",
      en: "Hello! Welcome to Yonsei Purumi Skin Clinic 😊\n\n👨‍⚕️ 3 specialist doctors\n🏆 #1 Laser clinic in Gangnam\n🌍 Multilingual consultation\n💡 Free skin analysis for first visit\n\nHow can we help you?",
      zh: "您好！欢迎来到延世푸르미皮肤科 😊\n\n👨‍⚕️ 3位专业皮肤科医生\n🏆 江南激光治疗第一\n🌍 多语言咨询\n💡 首次就诊免费皮肤分析\n\n请问有什么可以帮您？",
      ja: "こんにちは！延世プルミ皮膚科へようこそ 😊\n\n👨‍⚕️ 皮膚科専門医3名\n🏆 江南レーザー施術No.1\n🌍 多言語対応\n💡 初回無料肌分析\n\nどのようなご用件でしょうか？",
      th: "สวัสดี! ยินดีต้อนรับสู่คลินิก Yonsei Purumi 😊\n\n👨‍⚕️ แพทย์ผิวหนัง 3 ท่าน\n🏆 คลินิกเลเซอร์อันดับ 1\n🌍 ให้คำปรึกษาหลายภาษา\n💡 วิเคราะห์ผิวฟรีครั้งแรก\n\nเราช่วยอะไรคุณได้บ้าง?",
      vi: "Xin chào! Chào mừng đến với Yonsei Purumi 😊\n\n👨‍⚕️ 3 bác sĩ chuyên khoa\n🏆 Phòng khám laser #1 Gangnam\n🌍 Tư vấn đa ngôn ngữ\n💡 Phân tích da miễn phí lần đầu\n\nChúng tôi có thể giúp gì?",
      ar: "مرحباً! أهلاً بكم في عيادة يونسي 😊\n\n👨‍⚕️ 3 أطباء متخصصون\n🏆 عيادة الليزر الأولى\n🌍 استشارة متعددة اللغات\n💡 تحليل مجاني للبشرة\n\nكيف يمكننا مساعدتك؟",
      ru: "Здравствуйте! Добро пожаловать в Yonsei Purumi 😊\n\n👨‍⚕️ 3 врача-дерматолога\n🏆 Клиника №1 в Каннаме\n🌍 Консультация на нескольких языках\n💡 Бесплатный анализ кожи\n\nЧем мы можем помочь?",
      fr: "Bonjour! Bienvenue à Yonsei Purumi 😊\n\n👨‍⚕️ 3 médecins spécialistes\n🏆 Clinique laser #1 à Gangnam\n🌍 Consultation multilingue\n💡 Analyse de peau gratuite\n\nComment pouvons-nous vous aider?",
      es: "¡Hola! Bienvenido a Yonsei Purumi 😊\n\n👨‍⚕️ 3 médicos especialistas\n🏆 Clínica láser #1 en Gangnam\n🌍 Consulta multilingüe\n💡 Análisis de piel gratis\n\n¿En qué podemos ayudarte?"
    };
    const payload = {
      version: "2.0",
      template: {
        outputs: [
          { basicCard: {
            title: "✨ 연세푸르미피부과",
            description: "강남 대표 피부과 | 개원 20년",
            thumbnail: { imageUrl: bannerUrl, fixedRatio: false }
          }},
          { simpleText: { text: welcomeTexts[lang] || welcomeTexts.ko } }
        ],
        quickReplies: getQuickReplies(lang, industry)
      }
    };
    console.log('페이로드 생성완료, 전송시작');
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
  const labels = {
    ko: { intro: "📅 어떤 시술로 예약하시겠어요?\n원하시는 시술을 선택해주세요!", book: "이 시술로 예약", detail: "자세히 알아보기", t1: "✨ 레이저 토닝", d1: "기미·잡티·모공 개선\n시술시간: 약 30분", t2: "💉 보톡스", d2: "이마·눈가·팔자주름\n시술시간: 약 15분", t3: "💧 수분 리프팅", d3: "피부 탄력·수분 개선\n시술시간: 약 40분", t4: "🌟 피부 클리닉", d4: "여드름·모공·피부결 개선\n시술시간: 약 60분", t5: "🎁 무료 상담", d5: "첫 방문 무료 피부 분석\n전문의 1:1 상담", q1: "레이저토닝 설명해줘", q2: "보톡스 설명해줘", q3: "수분리프팅 설명해줘", q4: "피부클리닉 설명해줘", q5: "무료상담 설명해줘" },
    en: { intro: "📅 Which treatment would you like to book?\nPlease select a treatment!", book: "Book this", detail: "Learn more", t1: "✨ Laser Toning", d1: "Pigmentation & pore care\nDuration: ~30 min", t2: "💉 Botox", d2: "Forehead, eye, nasolabial\nDuration: ~15 min", t3: "💧 Moisture Lifting", d3: "Elasticity & hydration\nDuration: ~40 min", t4: "🌟 Skin Clinic", d4: "Acne, pores, skin texture\nDuration: ~60 min", t5: "🎁 Free Consultation", d5: "Free skin analysis\n1:1 doctor consultation", q1: "Tell me about laser toning", q2: "Tell me about botox", q3: "Tell me about moisture lifting", q4: "Tell me about skin clinic", q5: "Tell me about free consultation" },
    zh: { intro: "📅 您想预约哪种治疗？\n请选择治疗项目！", book: "预约此项目", detail: "了解更多", t1: "✨ 激光调肤", d1: "改善色斑·毛孔\n时间: 约30分钟", t2: "💉 肉毒素", d2: "额头·眼角·法令纹\n时间: 约15分钟", t3: "💧 水光针", d3: "改善弹力·水分\n时间: 约40分钟", t4: "🌟 皮肤诊疗", d4: "痤疮·毛孔·肤质\n时间: 约60分钟", t5: "🎁 免费咨询", d5: "首次免费皮肤分析\n专科医生1:1咨询", q1: "介绍激光调肤", q2: "介绍肉毒素", q3: "介绍水光针", q4: "介绍皮肤诊疗", q5: "介绍免费咨询" },
    ja: { intro: "📅 どの施術をご予約されますか？\n施術をお選びください！", book: "この施術を予約", detail: "詳しく見る", t1: "✨ レーザートーニング", d1: "シミ・毛穴ケア\n施術時間: 約30分", t2: "💉 ボトックス", d2: "額・目元・ほうれい線\n施術時間: 約15分", t3: "💧 水分リフティング", d3: "弾力・保湿改善\n施術時間: 約40分", t4: "🌟 スキンクリニック", d4: "ニキビ・毛穴・肌質\n施術時間: 約60分", t5: "🎁 無料カウンセリング", d5: "初回無料肌分析\n専門医1:1相談", q1: "レーザートーニングについて", q2: "ボトックスについて", q3: "水分リフティングについて", q4: "スキンクリニックについて", q5: "無料カウンセリングについて" }
  };
  const l = labels[lang] || labels.ko;
  try {
    const payload = {
      version: "2.0",
      template: {
        outputs: [
          { simpleText: { text: l.intro } },
          { carousel: {
            type: "basicCard",
            items: [
              { title: l.t1, description: l.d1, buttons: [{ action: "message", label: l.book, messageText: "레이저토닝 예약하기" }, { action: "message", label: l.detail, messageText: l.q1 }] },
              { title: l.t2, description: l.d2, buttons: [{ action: "message", label: l.book, messageText: "보톡스 예약하기" }, { action: "message", label: l.detail, messageText: l.q2 }] },
              { title: l.t3, description: l.d3, buttons: [{ action: "message", label: l.book, messageText: "수분리프팅 예약하기" }, { action: "message", label: l.detail, messageText: l.q3 }] },
              { title: l.t4, description: l.d4, buttons: [{ action: "message", label: l.book, messageText: "피부클리닉 예약하기" }, { action: "message", label: l.detail, messageText: l.q4 }] },
              { title: l.t5, description: l.d5, buttons: [{ action: "message", label: l.book, messageText: "무료상담 예약하기" }, { action: "message", label: l.detail, messageText: l.q5 }] }
            ]
          }}
        ],
        quickReplies: [{ label: (LANG_TEXTS[lang] || LANG_TEXTS.ko).home, action: "message", messageText: "처음으로" }]
      }
    };
    const res = await fetch(callbackUrl, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) });
    const resText = await res.text();
    console.log('sendBookingMenu 응답:', res.status, resText);
  } catch(e) {
    console.error('sendBookingMenu 오류:', e.message);
  }
}

async function sendConsultMenu(callbackUrl, lang = 'ko') {
  console.log('sendConsultMenu 시작, 언어:', lang);
  try {
    const menus = {
      ko: {
        text: "💬 어떤 고민이 있으신가요?\n아래에서 선택하시거나 직접 입력해주세요!",
        items: [
          { title: "🔴 여드름 / 모공", desc: "여드름 치료, 모공 축소\n블랙헤드, 화이트헤드\n피지 과다 분비", msg: "여드름이랑 모공 고민이에요", btn: "상담하기" },
          { title: "🌑 기미 / 잡티 / 색소", desc: "기미, 주근깨, 잡티\n피부톤 불균형\n색소침착 개선", msg: "기미랑 잡티 고민이에요", btn: "상담하기" },
          { title: "📉 주름 / 탄력", desc: "이마, 눈가, 팔자주름\n피부 처짐, 탄력 저하\n볼륨 감소", msg: "주름이랑 탄력 고민이에요", btn: "상담하기" },
          { title: "💧 피부 건조 / 민감", desc: "극건성, 민감성 피부\n홍조, 피부 자극\n수분 부족", msg: "건조하고 민감한 피부예요", btn: "상담하기" }
        ],
        home: "🏠 처음으로", homeMsg: "처음으로", price: "💰 가격안내", priceMsg: "가격안내"
      },
      en: {
        text: "💬 What is your skin concern?\nPlease select or type directly!",
        items: [
          { title: "🔴 Acne / Pores", desc: "Acne treatment, pore reduction\nBlackheads, whiteheads\nExcess sebum", msg: "I have acne and pore concerns", btn: "Consult" },
          { title: "🌑 Pigmentation / Dark spots", desc: "Melasma, freckles, dark spots\nUneven skin tone\nPigmentation improvement", msg: "I have pigmentation concerns", btn: "Consult" },
          { title: "📉 Wrinkles / Elasticity", desc: "Forehead, eye area, nasolabial\nSagging skin, loss of elasticity\nVolume loss", msg: "I have wrinkle concerns", btn: "Consult" },
          { title: "💧 Dry / Sensitive skin", desc: "Very dry, sensitive skin\nRedness, skin irritation\nMoisture deficiency", msg: "I have dry and sensitive skin", btn: "Consult" }
        ],
        home: "🏠 Home", homeMsg: "처음으로", price: "💰 Price", priceMsg: "가격안내"
      },
      zh: {
        text: "💬 您有什么皮肤烦恼？\n请选择或直接输入！",
        items: [
          { title: "🔴 痘痘 / 毛孔", desc: "痘痘治疗，毛孔收缩\n黑头，白头\n皮脂分泌过多", msg: "我有痘痘和毛孔问题", btn: "咨询" },
          { title: "🌑 色斑 / 雀斑", desc: "黄褐斑，雀斑，色斑\n肤色不均\n色素沉着改善", msg: "我有色斑问题", btn: "咨询" },
          { title: "📉 皱纹 / 弹力", desc: "额头，眼角，法令纹\n皮肤松弛，弹力下降\n容量减少", msg: "我有皱纹问题", btn: "咨询" },
          { title: "💧 干燥 / 敏感肌", desc: "极干性，敏感性皮肤\n泛红，皮肤刺激\n水分不足", msg: "我的皮肤干燥敏感", btn: "咨询" }
        ],
        home: "🏠 首页", homeMsg: "처음으로", price: "💰 价格", priceMsg: "가격안내"
      },
      ja: {
        text: "💬 どのようなお肌のお悩みですか？\n下記から選択またはそのままご入力ください！",
        items: [
          { title: "🔴 ニキビ / 毛穴", desc: "ニキビ治療、毛穴縮小\n黒ずみ、白ニキビ\n皮脂過多", msg: "ニキビと毛穴が気になります", btn: "相談する" },
          { title: "🌑 シミ / くすみ", desc: "シミ、そばかす、くすみ\n肌トーン不均一\n色素沈着改善", msg: "シミが気になります", btn: "相談する" },
          { title: "📉 しわ / たるみ", desc: "額、目元、ほうれい線\肌のたるみ、弾力低下\nボリューム減少", msg: "しわとたるみが気になります", btn: "相談する" },
          { title: "💧 乾燥 / 敏感肌", desc: "超乾燥、敏感肌\n赤み、肌刺激\n水分不足", msg: "肌が乾燥して敏感です", btn: "相談する" }
        ],
        home: "🏠 ホーム", homeMsg: "처음으로", price: "💰 料金", priceMsg: "가격안내"
      },
      th: {
        text: "💬 คุณมีปัญหาผิวหนังอะไร?\nกรุณาเลือกหรือพิมพ์โดยตรง!",
        items: [
          { title: "🔴 สิว / รูขุมขน", desc: "รักษาสิว, ลดรูขุมขน\nสิวหัวดำ, สิวหัวขาว\nผิวมัน", msg: "ฉันมีปัญหาสิวและรูขุมขน", btn: "ปรึกษา" },
          { title: "🌑 ฝ้า / กระ", desc: "ฝ้า, กระ, จุดด่างดำ\nผิวไม่สม่ำเสมอ\nการปรับปรุงเม็ดสี", msg: "ฉันมีปัญหาฝ้าและกระ", btn: "ปรึกษา" },
          { title: "📉 ริ้วรอย / ความยืดหยุ่น", desc: "หน้าผาก, รอบดวงตา\nผิวหย่อนคล้อย\nสูญเสียความยืดหยุ่น", msg: "ฉันมีปัญหาริ้วรอย", btn: "ปรึกษา" },
          { title: "💧 ผิวแห้ง / แพ้ง่าย", desc: "ผิวแห้งมาก, แพ้ง่าย\nผิวแดง, ระคายเคือง\nขาดความชุ่มชื้น", msg: "ผิวของฉันแห้งและแพ้ง่าย", btn: "ปรึกษา" }
        ],
        home: "🏠 หน้าหลัก", homeMsg: "처음으로", price: "💰 ราคา", priceMsg: "가격안내"
      },
      vi: {
        text: "💬 Bạn có vấn đề gì về da?\nVui lòng chọn hoặc nhập trực tiếp!",
        items: [
          { title: "🔴 Mụn / Lỗ chân lông", desc: "Điều trị mụn, thu nhỏ lỗ chân lông\nMụn đầu đen, mụn đầu trắng\nDa dầu", msg: "Tôi có vấn đề về mụn và lỗ chân lông", btn: "Tư vấn" },
          { title: "🌑 Nám / Tàn nhang", desc: "Nám, tàn nhang, đốm nâu\nTông màu da không đều\nCải thiện sắc tố", msg: "Tôi có vấn đề về nám da", btn: "Tư vấn" },
          { title: "📉 Nếp nhăn / Độ đàn hồi", desc: "Trán, vùng mắt, rãnh mũi má\nDa chảy xệ\nMất độ đàn hồi", msg: "Tôi có vấn đề về nếp nhăn", btn: "Tư vấn" },
          { title: "💧 Da khô / Nhạy cảm", desc: "Da rất khô, nhạy cảm\nDa đỏ, kích ứng\nThiếu độ ẩm", msg: "Da tôi khô và nhạy cảm", btn: "Tư vấn" }
        ],
        home: "🏠 Trang chủ", homeMsg: "처음으로", price: "💰 Giá", priceMsg: "가격안내"
      },
      ar: {
        text: "💬 ما هي مشكلة بشرتك؟\nيرجى الاختيار أو الكتابة مباشرة!",
        items: [
          { title: "🔴 حب الشباب / المسام", desc: "علاج حب الشباب\nتقليص المسام\nالرؤوس السوداء والبيضاء", msg: "لدي مشكلة في حب الشباب والمسام", btn: "استشارة" },
          { title: "🌑 البقع / التصبغ", desc: "الكلف، النمش، البقع\nعدم انتظام لون البشرة\nتحسين التصبغ", msg: "لدي مشكلة في تصبغ البشرة", btn: "استشارة" },
          { title: "📉 التجاعيد / المرونة", desc: "الجبهة، العينان، خطوط الابتسامة\nترهل الجلد\nفقدان المرونة", msg: "لدي مشكلة في التجاعيد", btn: "استشارة" },
          { title: "💧 البشرة الجافة / الحساسة", desc: "بشرة جافة جداً وحساسة\nاحمرار وتهيج\nنقص الرطوبة", msg: "بشرتي جافة وحساسة", btn: "استشارة" }
        ],
        home: "🏠 الرئيسية", homeMsg: "처음으로", price: "💰 الأسعار", priceMsg: "가격안내"
      },
      ru: {
        text: "💬 Какая у вас проблема с кожей?\nВыберите или введите напрямую!",
        items: [
          { title: "🔴 Акне / Поры", desc: "Лечение акне, сужение пор\nЧёрные и белые угри\nИзбыток кожного сала", msg: "У меня проблемы с акне и порами", btn: "Консультация" },
          { title: "🌑 Пигментация / Пятна", desc: "Мелазма, веснушки, пятна\nНеравномерный тон кожи\nУлучшение пигментации", msg: "У меня проблемы с пигментацией", btn: "Консультация" },
          { title: "📉 Морщины / Упругость", desc: "Лоб, вокруг глаз, носогубные складки\nДряблость кожи\nПотеря упругости", msg: "У меня проблемы с морщинами", btn: "Консультация" },
          { title: "💧 Сухая / Чувствительная", desc: "Очень сухая, чувствительная кожа\nПокраснение, раздражение\nНедостаток влаги", msg: "У меня сухая и чувствительная кожа", btn: "Консультация" }
        ],
        home: "🏠 Главная", homeMsg: "처음으로", price: "💰 Цены", priceMsg: "가격안내"
      },
      fr: {
        text: "💬 Quel est votre problème de peau?\nVeuillez sélectionner ou saisir directement!",
        items: [
          { title: "🔴 Acné / Pores", desc: "Traitement de l'acné\nRéduction des pores\nPoints noirs et blancs", msg: "J'ai des problèmes d'acné et de pores", btn: "Consulter" },
          { title: "🌑 Taches / Pigmentation", desc: "Mélasma, taches de rousseur\nTon de peau irrégulier\nAmélioration de la pigmentation", msg: "J'ai des problèmes de pigmentation", btn: "Consulter" },
          { title: "📉 Rides / Élasticité", desc: "Front, yeux, sillons nasogéniens\nRelâchement cutané\nPerte d'élasticité", msg: "J'ai des problèmes de rides", btn: "Consulter" },
          { title: "💧 Peau sèche / Sensible", desc: "Peau très sèche et sensible\nRougeurs, irritations\nManque d'hydratation", msg: "J'ai la peau sèche et sensible", btn: "Consulter" }
        ],
        home: "🏠 Accueil", homeMsg: "처음으로", price: "💰 Tarifs", priceMsg: "가격안내"
      },
      es: {
        text: "💬 ¿Cuál es tu problema de piel?\n¡Por favor selecciona o escribe directamente!",
        items: [
          { title: "🔴 Acné / Poros", desc: "Tratamiento del acné\nReducción de poros\nEspinillas negras y blancas", msg: "Tengo problemas de acné y poros", btn: "Consultar" },
          { title: "🌑 Manchas / Pigmentación", desc: "Melasma, pecas, manchas\nTono de piel desigual\nMejora de la pigmentación", msg: "Tengo problemas de pigmentación", btn: "Consultar" },
          { title: "📉 Arrugas / Elasticidad", desc: "Frente, ojos, surcos nasales\nFlacidez cutánea\nPérdida de elasticidad", msg: "Tengo problemas de arrugas", btn: "Consultar" },
          { title: "💧 Piel seca / Sensible", desc: "Piel muy seca y sensible\nRojez, irritación\nFalta de hidratación", msg: "Mi piel es seca y sensible", btn: "Consultar" }
        ],
        home: "🏠 Inicio", homeMsg: "처음으로", price: "💰 Precios", priceMsg: "가격안내"
      }
    };

    const m = menus[lang] || menus.ko;
    const payload = {
      version: "2.0",
      template: {
        outputs: [
          { simpleText: { text: m.text } },
          { carousel: {
            type: "basicCard",
            items: m.items.map(i => ({
              title: i.title,
              description: i.desc,
              buttons: [{ action: "message", label: i.btn, messageText: i.msg }]
            }))
          }}
        ],
        quickReplies: [
          { label: m.home, action: "message", messageText: m.homeMsg },
          { label: m.price, action: "message", messageText: m.priceMsg }
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
  const lt = LANG_TEXTS[lang] || LANG_TEXTS.ko;
  const titles = {
    ko: '💰 시술 가격 안내', en: '💰 Treatment Prices', zh: '💰 治疗价格',
    ja: '💰 施術料金案内', th: '💰 ราคาการรักษา', vi: '💰 Bảng giá dịch vụ',
    ar: '💰 أسعار العلاجات', ru: '💰 Цены на процедуры', fr: '💰 Tarifs des soins', es: '💰 Precios de tratamientos'
  };
  const items = {
    ko: [
      { title: '✨ 레이저 토닝', desc: '기미·잡티·모공 개선\n1회: 150,000원\n5회 패키지: 650,000원' },
      { title: '💉 보톡스', desc: '이마·눈가·팔자주름\n1부위: 100,000원\n3부위: 250,000원' },
      { title: '💧 수분 리프팅', desc: '피부 탄력·수분 개선\n1회: 200,000원\n3회 패키지: 550,000원' },
      { title: '🌿 피부 클리닉', desc: '여드름·피부트러블 케어\n1회: 80,000원\n5회 패키지: 350,000원' }
    ],
    en: [
      { title: '✨ Laser Toning', desc: 'Pigmentation & Pore Care\n1 session: ₩150,000\n5 sessions: ₩650,000' },
      { title: '💉 Botox', desc: 'Forehead, Eyes, Nasolabial\n1 area: ₩100,000\n3 areas: ₩250,000' },
      { title: '💧 Moisture Lifting', desc: 'Elasticity & Hydration\n1 session: ₩200,000\n3 sessions: ₩550,000' },
      { title: '🌿 Skin Clinic', desc: 'Acne & Skin Care\n1 session: ₩80,000\n5 sessions: ₩350,000' }
    ],
    zh: [
      { title: '✨ 激光嫩肤', desc: '改善色斑·毛孔\n1次: ₩150,000\n5次套餐: ₩650,000' },
      { title: '💉 肉毒杆菌', desc: '额头·眼角·法令纹\n1个部位: ₩100,000\n3个部位: ₩250,000' },
      { title: '💧 水光针', desc: '改善弹力·保湿\n1次: ₩200,000\n3次套餐: ₩550,000' },
      { title: '🌿 皮肤诊所', desc: '痤疮·皮肤问题护理\n1次: ₩80,000\n5次套餐: ₩350,000' }
    ],
    ja: [
      { title: '✨ レーザートーニング', desc: 'シミ・毛穴ケア\n1回: ₩150,000\n5回パック: ₩650,000' },
      { title: '💉 ボトックス', desc: 'おでこ・目元・ほうれい線\n1部位: ₩100,000\n3部位: ₩250,000' },
      { title: '💧 水分リフティング', desc: '弾力・保湿改善\n1回: ₩200,000\n3回パック: ₩550,000' },
      { title: '🌿 スキンクリニック', desc: 'ニキビ・肌荒れケア\n1回: ₩80,000\n5回パック: ₩350,000' }
    ]
  };
  const bookLabels = {
    ko: '📅 예약하기', en: '📅 Book Now', zh: '📅 立即预约',
    ja: '📅 予約する', th: '📅 จองเลย', vi: '📅 Đặt ngay',
    ar: '📅 احجز الآن', ru: '📅 Записаться', fr: '📅 Réserver', es: '📅 Reservar'
  };
  const bookMsgs = {
    ko: '예약하기', en: '예약하기', zh: '예약하기', ja: '예약하기',
    th: '예약하기', vi: '예약하기', ar: '예약하기', ru: '예약하기', fr: '예약하기', es: '예약하기'
  };
  const priceItems = items[lang] || items.en;
  const bookLabel = bookLabels[lang] || bookLabels.en;
  try {
    const res = await fetch(callbackUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        version: '2.0',
        template: {
          outputs: [
            { simpleText: { text: titles[lang] || titles.en } },
            { carousel: {
              type: 'basicCard',
              items: priceItems.map(item => ({
                title: item.title,
                description: item.desc,
                buttons: [{ action: 'message', label: bookLabel, messageText: '예약하기' }]
              }))
            }}
          ],
          quickReplies: getQuickReplies(lang, industry)
        }
      })
    });
    const resText = await res.text();
    console.log('sendPriceMenu 응답:', res.status, resText);
  } catch(e) {
    console.error('sendPriceMenu 오류:', e.message);
  }
}

async function showDoctors(callbackUrl, lang) {
  const doctorLang = lang || 'ko';
  const titles = {
    ko: '👨‍⚕️ 의료진 소개', en: '👨‍⚕️ Our Doctors', zh: '👨‍⚕️ 医师介绍',
    ja: '👨‍⚕️ 医師紹介', th: '👨‍⚕️ แพทย์ของเรา', vi: '👨‍⚕️ Bác sĩ của chúng tôi',
    ar: '👨‍⚕️ أطباؤنا', ru: '👨‍⚕️ Наши врачи', fr: '👨‍⚕️ Nos médecins', es: '👨‍⚕️ Nuestros médicos'
  };
  
  const doctors = {
    ko: [
      { name: '김연세 원장', spec: '피부과 전문의\n경력 20년\n레이저 시술 전문', btn: '김연세 원장으로 예약하기', img: BASE_URL+'/doctor_1.jpg' },
      { name: '박푸르미 원장', spec: '피부과 전문의\n경력 15년\n보톡스·필러 전문', btn: '박푸르미 원장으로 예약하기', img: BASE_URL+'/doctor_2.jpg' },
      { name: '이미소 원장', spec: '피부과 전문의\n경력 10년\n피부 관리 전문', btn: '이미소 원장으로 예약하기', img: BASE_URL+'/doctor_3.jpg' }
    ],
    en: [
      { name: 'Dr. Kim Yonsei', spec: 'Dermatologist\n20 years experience\nLaser treatment specialist', btn: '김연세 원장으로 예약하기' },
      { name: 'Dr. Park Purumi', spec: 'Dermatologist\n15 years experience\nBotox & Filler specialist', btn: '박푸르미 원장으로 예약하기' },
      { name: 'Dr. Lee Miso', spec: 'Dermatologist\n10 years experience\nSkin care specialist', btn: '이미소 원장으로 예약하기', img: BASE_URL+'/doctor_3.jpg' }
    ],
    zh: [
      { name: '金延世院长', spec: '皮肤科专科医师\n20年经验\n激光治疗专家', btn: '김연세 원장으로 예약하기', img: BASE_URL+'/doctor_1.jpg' },
      { name: '朴普鲁美院长', spec: '皮肤科专科医师\n15年经验\n肉毒杆菌·填充专家', btn: '박푸르미 원장으로 예약하기', img: BASE_URL+'/doctor_2.jpg' },
      { name: '李美笑院长', spec: '皮肤科专科医师\n10年经验\n皮肤护理专家', btn: '이미소 원장으로 예약하기', img: BASE_URL+'/doctor_3.jpg' }
    ],
    ja: [
      { name: 'キム・ヨンセ院長', spec: '皮膚科専門医\n経歴20年\nレーザー治療専門', btn: '김연세 원장으로 예약하기', img: BASE_URL+'/doctor_1.jpg' },
      { name: 'パク・プルミ院長', spec: '皮膚科専門医\n経歴15年\nボトックス・フィラー専門', btn: '박푸르미 원장으로 예약하기', img: BASE_URL+'/doctor_2.jpg' },
      { name: 'イ・ミソ院長', spec: '皮膚科専門医\n経歴10年\nスキンケア専門', btn: '이미소 원장으로 예약하기', img: BASE_URL+'/doctor_3.jpg' }
    ]
  };
  const bookBtnLabels = {
    ko: '📅 예약하기', en: '📅 Book', zh: '📅 预约', ja: '📅 予約する',
    th: '📅 จอง', vi: '📅 Đặt lịch', ar: '📅 حجز', ru: '📅 Записаться', fr: '📅 Réserver', es: '📅 Reservar'
  };
  const docList = doctors[lang] || doctors.en;
  const bookLabel = bookBtnLabels[lang] || bookBtnLabels.en;
  const outputs = [
    { simpleText: { text: titles[lang] || titles.en } },
    { carousel: {
      type: 'basicCard',
      items: docList.map(d => ({
        title: d.name,
        description: d.spec,
        thumbnail: d.img ? { imageUrl: d.img, fixedRatio: false } : undefined,
        buttons: [{ action: 'message', label: bookLabel, messageText: d.btn }]
      }))
    }}
  ];
  try {
    const res = await fetch(callbackUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        version: '2.0',
        template: {
          outputs,
          quickReplies: getQuickReplies(doctorLang, session.industry || 'hospital')
        }
      })
    });
    const resText = await res.text();
    console.log('showDoctors 응답:', res.status, resText);
  } catch(e) {
    console.error('showDoctors 오류:', e.message);
  }
}

module.exports = router;
