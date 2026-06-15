const express = require('express');
const router = express.Router();
const fetch = (...args) => import('node-fetch').then(({default: fetch}) => fetch(...args));
const { chat } = require('../services/gemini');
require('dotenv').config();

const sessions = {};
const BASE_URL = `http://${process.env.SERVER_IP}:3002`;

function getSession(userId) {
  if (!sessions[userId]) {
    sessions[userId] = { history: [], data: {}, booted: false };
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
    await fetch(callbackUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body)
    });
  } catch(e) { console.error('콜백오류:', e.message); }
}

const mainQuickReplies = [
  { label: "📅 예약하기", action: "message", messageText: "예약하기" },
  { label: "💬 상담하기", action: "message", messageText: "상담하기" },
  { label: "💰 가격안내", action: "message", messageText: "가격안내" },
  { label: "👨‍⚕️ 의료진 보기", action: "message", messageText: "의료진보기" }
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

  const session = getSession(kakaoUserId);

  try {
    // 리셋
    const resetKeywords = ['처음으로', '다시', '취소', '홈', '처음'];
    if (resetKeywords.includes(userMessage)) {
      session.history = [];
      session.data = {};
      session.booted = false;
      await showWelcome(callbackUrl);
      return;
    }

    // 첫 진입
    if (session.history.length === 0 && !resetKeywords.includes(userMessage)) {
      await showWelcome(callbackUrl);
      return;
    }

    // 가격안내
    if (userMessage === '가격안내') {
      const priceUrl = `${BASE_URL}/price_hospital.jpg`;
      await fetch(callbackUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          version: "2.0",
          template: {
            outputs: [
              { simpleText: { text: "시술 가격표를 확인해주세요! 😊" } },
              { basicCard: {
                thumbnail: { imageUrl: priceUrl, fixedRatio: false },
                buttons: [{ action: "webLink", label: "크게 보기 🔍", webLinkUrl: priceUrl }]
              }}
            ],
            quickReplies: mainQuickReplies
          }
        })
      });
      return;
    }

    // 의료진 보기
    if (userMessage === '의료진보기') {
      await showDoctors(callbackUrl, null);
      return;
    }

    // 예약하기
    if (userMessage === '예약하기') {
      await fetch(callbackUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          version: "2.0",
          template: {
            outputs: [
              { basicCard: {
                title: "📅 날짜/시간 선택",
                description: "버튼을 눌러 날짜와 시간을 선택해주세요!",
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

    // 날짜선택완료
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

    // Gemini AI 상담
    const geminiReply = await chat(session.history, userMessage, session.booted, 'hospital');
    session.history.push({ role: "user", content: userMessage });
    session.history.push({ role: "model", content: geminiReply.message });
    if (session.history.length > 20) session.history = session.history.slice(-20);

    // SHOW_DOCTORS
    if (geminiReply.showDoctors) {
      await showDoctors(callbackUrl, geminiReply.message);
      return;
    }

    // SHOW_PRICE
    if (geminiReply.showPrice) {
      const priceUrl = `${BASE_URL}/price_hospital.jpg`;
      await fetch(callbackUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          version: "2.0",
          template: {
            outputs: [
              { simpleText: { text: geminiReply.message } },
              { basicCard: {
                thumbnail: { imageUrl: priceUrl, fixedRatio: false },
                buttons: [{ action: "webLink", label: "크게 보기 🔍", webLinkUrl: priceUrl }]
              }}
            ],
            quickReplies: mainQuickReplies
          }
        })
      });
      return;
    }

    // SHOW_CALENDAR
    if (geminiReply.showCalendar) {
      await fetch(callbackUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          version: "2.0",
          template: {
            outputs: [
              { simpleText: { text: geminiReply.message } },
              { basicCard: {
                title: "📅 날짜/시간 선택",
                description: "버튼을 눌러 날짜와 시간을 선택해주세요!",
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

    // SHOW_BOOKING_TYPE
    if (geminiReply.showBookingType) {
      await fetch(callbackUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          version: "2.0",
          template: {
            outputs: [{ simpleText: { text: geminiReply.message } }],
            quickReplies: mainQuickReplies
          }
        })
      });
      return;
    }

    // HUMAN_AGENT_REQUEST
    if (geminiReply.humanAgentRequest) {
      await sendTelegram(`🚨 상담원 연결 요청!\n\n고객 발화: "${userMessage}"\n\n카카오 채널에서 확인하세요.`);
    }

    // RESET
    if (geminiReply.reset) {
      session.history = [];
      session.data = {};
      session.booted = false;
      await showWelcome(callbackUrl);
      return;
    }

    // 예약 완료 감지
    if (geminiReply.bookingData) {
      const d = geminiReply.bookingData;
      if (d.name && d.phone && d.service && d.date && d.time) {
        await sendTelegram(
          `📋 새 예약 접수!\n\n👤 이름: ${d.name}\n📞 연락처: ${d.phone}\n💉 시술: ${d.service}\n👨‍⚕️ 원장: ${d.doctor || '미정'}\n📅 날짜: ${d.date}\n⏰ 시간: ${d.time}\n💬 피부고민: ${d.skin_concern || '없음'}`
        );
        session.booted = true;
      }
    }

    // 일반 응답
    await sendCallback(callbackUrl, geminiReply.message,
      [{ label: "🏠 처음으로", action: "message", messageText: "처음으로" }]
    );

  } catch(err) {
    console.error('오류:', err);
    await sendCallback(callbackUrl, "잠시 오류가 발생했습니다. 다시 시도해주세요 😊");
  }
}

async function showWelcome(callbackUrl) {
  const bannerUrl = `${BASE_URL}/banner_hospital.jpg`;
  await fetch(callbackUrl, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      version: "2.0",
      template: {
        outputs: [
          { basicCard: { thumbnail: { imageUrl: bannerUrl, fixedRatio: false } } },
          { simpleText: { text: "안녕하세요! 연세푸르미피부과입니다 😊\n\n피부과 전문의 3인이 함께하는 강남 대표 피부과예요.\n\n💡 첫 방문 고객님께는 무료 피부 상태 분석을 제공해드립니다!" } }
        ],
        quickReplies: mainQuickReplies
      }
    })
  });
}

async function showDoctors(callbackUrl, message) {
  const doctors = [
    { name: "김연세 원장", desc: "피부과 전문의 20년 | 레이저 시술 전문", img: "doctor_1.jpg", msg: "김연세 원장 선택" },
    { name: "박푸르미 원장", desc: "피부과 전문의 15년 | 여드름/흉터 전문", img: "doctor_2.jpg", msg: "박푸르미 원장 선택" },
    { name: "이미소 원장", desc: "피부과 전문의 10년 | 안티에이징/리프팅 전문", img: "doctor_3.jpg", msg: "이미소 원장 선택" }
  ];
  const carouselItems = doctors.map(d => ({
    title: d.name,
    description: d.desc,
    thumbnail: { imageUrl: `${BASE_URL}/${d.img}`, link: { web: `${BASE_URL}/${d.img}` } },
    buttons: [
      { action: "message", label: "선택하기", messageText: d.msg },
      { action: "webLink", label: "크게 보기 🔍", webLinkUrl: `${BASE_URL}/${d.img}` }
    ]
  }));
  const outputs = [];
  if (message) outputs.push({ simpleText: { text: message } });
  outputs.push({ carousel: { type: "basicCard", items: carouselItems } });
  await fetch(callbackUrl, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ version: "2.0", template: { outputs } })
  });
}

module.exports = router;
