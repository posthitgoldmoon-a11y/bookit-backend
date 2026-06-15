const express = require('express');
const router = express.Router();
const fetch = (...args) => import('node-fetch').then(({default: fetch}) => fetch(...args));
const { chat } = require('../services/gemini');
require('dotenv').config();

const sessions = {};
const BASE_URL = `http://${process.env.SERVER_IP}:3002`;

function getSession(userId) {
  if (!sessions[userId]) {
    sessions[userId] = { history: [], data: {}, booted: false, visited: false };
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

async function sendCallback(callbackUrl, text, quickReplies = null) {
  const body = {
    version: "2.0",
    template: { outputs: [{ simpleText: { text } }] }
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
      await showWelcome(callbackUrl);
      return;
    }

    if (!session.visited) {
      session.visited = true;
      await showWelcome(callbackUrl);
      return;
    }

    // 언어 선택
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
        await showMainMenu(callbackUrl, session.data.lang);
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
    const bookingKeywords = ["레이저토닝 예약하기", "보톡스 예약하기", "수분리프팅 예약하기", "피부클리닉 예약하기", "무료상담 예약하기", "김연세 원장으로 예약하기", "박푸르미 원장으로 예약하기", "이미소 원장으로 예약하기"];
    if (bookingKeywords.includes(userMessage)) {
      session.data.service = userMessage.replace(" 예약하기", "").replace("으로 예약하기", "");
      await fetch(callbackUrl, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          version: "2.0",
          template: {
            outputs: [
              { simpleText: { text: `${session.data.service} 예약을 진행할게요! 😊

날짜와 시간을 선택해주세요!` } },
              { basicCard: {
                title: "📅 날짜/시간 선택",
                description: "아래 버튼을 눌러 날짜와 시간을 선택해주세요!",
                buttons: [
                  { action: "webLink", label: "📅 날짜/시간 선택하기", webLinkUrl: `${BASE_URL}/calendar.html?userId=${kakaoUserId}` },
                  { action: "message", label: "✅ 날짜선택완료", messageText: "날짜선택완료" }
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
      await sendCallback(callbackUrl,
        "📍 연세푸르미피부과 오시는 길\n\n📌 서울 강남구 강남대로 123 푸르미빌딩 5층\n\n🚇 강남역 2번 출구 도보 3분\n🚗 건물 내 주차 1시간 무료\n📞 02-1234-5678",
        [
          { label: "🗺️ 카카오맵 보기", action: "webLink", webLinkUrl: "https://map.kakao.com/?q=강남역피부과" },
          { label: "🏠 처음으로", action: "message", messageText: "처음으로" }
        ]
      );
      return;
    }

    if (userMessage === '진료시간') {
      await sendCallback(callbackUrl,
        "⏰ 진료 시간 안내\n\n🗓️ 평일 (월~금): 10:00 ~ 19:00\n🗓️ 토요일: 10:00 ~ 16:00\n🗓️ 일·공휴일: 휴진\n⚠️ 점심: 13:00 ~ 14:00\n\n📞 02-1234-5678\n💡 카카오 예약 시 대기 없이 진료!",
        mainQuickReplies
      );
      return;
    }

    if (userMessage === '의료진보기') {
      await showDoctors(callbackUrl, null);
      return;
    }

    if (userMessage === '날짜선택완료') {
      try {
        const r = await fetch(`http://localhost:3002/calendar-result/${kakaoUserId}`);
        const data = await r.json();
        if (!data.success || !data.datetime) {
          await sendCallback(callbackUrl, "캘린더에서 날짜를 먼저 선택해주세요! 📅",
            [{ label: "✅ 날짜선택완료", action: "message", messageText: "날짜선택완료" }]
          );
          return;
        }
        session.data.date = data.datetime;
        const dateMsg = `📅 ${data.datetime} 선택하셨습니다!\n\n고객님 성함을 알려주세요 😊`;
        session.history.push({ role: "user", content: `날짜 ${data.datetime} 선택` });
        session.history.push({ role: "model", content: dateMsg });
        await sendCallback(callbackUrl, dateMsg);
      } catch(e) {
        await sendCallback(callbackUrl, "오류가 발생했습니다. 다시 시도해주세요 😊");
      }
      return;
    }

    console.log('🌍 언어값:', session.data.lang, '/ 사용언어:', session.data.lang || 'ko');
    const geminiReply = await chat(session.history, userMessage, session.booted, 'hospital', session.data.lang || 'ko');
    session.history.push({ role: "user", content: userMessage });
    session.history.push({ role: "model", content: geminiReply.message });
    if (session.history.length > 20) session.history = session.history.slice(-20);

    if (geminiReply.showDoctors) { await showDoctors(callbackUrl, geminiReply.message); return; }
    if (geminiReply.showPrice) { await sendPriceMenu(callbackUrl, session.data.lang || 'ko'); return; }
    if (geminiReply.showCalendar) { await sendBookingMenu(callbackUrl, kakaoUserId); return; }
    if (geminiReply.showBookingType) {
      await sendCallback(callbackUrl, geminiReply.message, mainQuickReplies);
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

    await sendCallback(callbackUrl, geminiReply.message,
      [{ label: "🏠 처음으로", action: "message", messageText: "처음으로" }]
    );

  } catch(err) {
    console.error('❌ 전체오류:', err.message);
    console.error(err.stack);
    await sendCallback(callbackUrl, "잠시 오류가 발생했습니다. 다시 시도해주세요 😊");
  }
}

async function showWelcome(callbackUrl) {
  console.log('showWelcome 시작');
  // 세션 초기화 방지
  try {
    const bannerUrl = `${BASE_URL}/banner_hospital.jpg`;
    const payload = {
      version: "2.0",
      template: {
        outputs: [
          { basicCard: {
            title: "✨ 연세푸르미피부과",
            description: "강남 대표 피부과 | 개원 20년",
            thumbnail: { imageUrl: bannerUrl, fixedRatio: false }
          }},
          { simpleText: { text: "안녕하세요! 연세푸르미피부과입니다 😊\n\n👨‍⚕️ 피부과 전문의 3인 운영\n🏆 강남 레이저 시술 1위 병원\n🌍 외국인 다국어 상담 가능\n💡 첫 방문 고객 무료 피부 분석\n\n무엇을 도와드릴까요?" } }
        ],
        quickReplies: mainQuickReplies
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
        quickReplies: [{ label: "🏠 처음으로", action: "message", messageText: "처음으로" }]
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

async function sendPriceMenu(callbackUrl) {
  console.log('sendPriceMenu 시작');
  try {
    const payload = {
      version: "2.0",
      template: {
        outputs: [
          { simpleText: { text: "💰 시술 가격 안내드립니다!\n모든 가격은 부가세 포함이며\n첫 방문 시 상담 후 확정됩니다 😊" } },
          { carousel: {
            type: "basicCard",
            items: [
              {
                title: "✨ 레이저 시술",
                description: "레이저 토닝 1회: 80,000원\n레이저 토닝 5회: 350,000원\n탄산 레이저: 120,000원\nIPL 1회: 150,000원",
                buttons: [{ action: "message", label: "예약하기", messageText: "레이저토닝 예약하기" }]
              },
              {
                title: "💉 보톡스 / 필러",
                description: "보톡스 이마: 99,000원\n보톡스 눈가: 79,000원\n보톡스 팔자: 89,000원\n필러 1cc: 350,000원~",
                buttons: [{ action: "message", label: "예약하기", messageText: "보톡스 예약하기" }]
              },
              {
                title: "💧 리프팅 / 수분",
                description: "물광주사 1회: 150,000원\n실리프팅 1회: 500,000원\n울쎄라 전체: 1,200,000원\n인모드 1회: 400,000원",
                buttons: [{ action: "message", label: "예약하기", messageText: "수분리프팅 예약하기" }]
              },
              {
                title: "🔬 피부 클리닉",
                description: "여드름 압출: 30,000원\n흉터 레이저: 100,000원\n색소 치료: 80,000원\n복합 패키지: 문의",
                buttons: [{ action: "message", label: "패키지 문의", messageText: "패키지 가격 알려줘" }]
              },
              {
                title: "🌟 이벤트 / 패키지",
                description: "신규 고객 20% 할인\n5회 패키지 25% 할인\n외국인 고객 10% 할인\n카카오 예약 특별 혜택",
                buttons: [{ action: "message", label: "이벤트 자세히 보기", messageText: "이벤트 알려줘" }]
              }
            ]
          }}
        ],
        quickReplies: mainQuickReplies
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

async function showDoctors(callbackUrl, message) {
  console.log('showDoctors 시작');
  try {
    const doctors = [
      {
        name: "김연세 원장",
        desc: "前 서울대병원 피부과\n레이저 토닝·기미 전문\n경력 20년 | 누적 시술 50,000건",
        img: "doctor_1.jpg",
        msg: "김연세 원장으로 예약하기"
      },
      {
        name: "박푸르미 원장",
        desc: "前 강남세브란스 피부과\n여드름·흉터·모공 전문\n경력 15년 | SCI 논문 12편",
        img: "doctor_2.jpg",
        msg: "박푸르미 원장으로 예약하기"
      },
      {
        name: "이미소 원장",
        desc: "前 아산병원 피부과\n안티에이징·리프팅 전문\n경력 10년 | 외국어 상담 가능",
        img: "doctor_3.jpg",
        msg: "이미소 원장으로 예약하기"
      }
    ];
    const carouselItems = doctors.map(d => ({
      title: d.name,
      description: d.desc,
      thumbnail: { imageUrl: `${BASE_URL}/${d.img}`, link: { web: `${BASE_URL}/${d.img}` } },
      buttons: [
        { action: "message", label: "이 원장으로 예약하기", messageText: d.msg },
        { action: "webLink", label: "프로필 크게 보기", webLinkUrl: `${BASE_URL}/${d.img}` }
      ]
    }));
    const outputs = [];
    if (message) outputs.push({ simpleText: { text: message } });
    outputs.push({ simpleText: { text: "👨‍⚕️ 의료진을 소개합니다!\n원하시는 원장님을 선택하시면 예약 가능해요 😊" } });
    outputs.push({ carousel: { type: "basicCard", items: carouselItems } });
    const res = await fetch(callbackUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        version: "2.0",
        template: {
          outputs,
          quickReplies: [
            { label: "📅 예약하기", action: "message", messageText: "예약하기" },
            { label: "🏠 처음으로", action: "message", messageText: "처음으로" }
          ]
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
