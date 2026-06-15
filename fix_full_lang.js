const fs = require('fs');
const file = '/home/ubuntu/bookit-backend/src/routes/webhook.js';
let content = fs.readFileSync(file, 'utf8');

// =====================
// 공통 언어 텍스트 맵 (파일 상단에 추가)
// =====================
const langTextsConst = `
// 공통 다국어 텍스트
const LANG_TEXTS = {
  ko: { home: "🏠 처음으로", homeMsg: "처음으로", error: "잠시 오류가 발생했습니다. 다시 시도해주세요 😊", calError: "캘린더에서 날짜를 먼저 선택해주세요! 📅", calRetry: "✅ 날짜선택완료", dateSelected: (dt) => \`📅 \${dt} 선택하셨습니다!\\n\\n고객님 성함을 알려주세요 😊\` },
  en: { home: "🏠 Home", homeMsg: "처음으로", error: "An error occurred. Please try again 😊", calError: "Please select a date from the calendar first! 📅", calRetry: "✅ Done", dateSelected: (dt) => \`📅 \${dt} selected!\\n\\nMay I have your name please? 😊\` },
  zh: { home: "🏠 首页", homeMsg: "처음으로", error: "发生错误，请重试 😊", calError: "请先从日历中选择日期！📅", calRetry: "✅ 完成", dateSelected: (dt) => \`📅 已选择 \${dt}！\\n\\n请告诉我您的姓名 😊\` },
  ja: { home: "🏠 ホーム", homeMsg: "처음으로", error: "エラーが発生しました。もう一度お試しください 😊", calError: "カレンダーから日付を選択してください！📅", calRetry: "✅ 選択完了", dateSelected: (dt) => \`📅 \${dt} を選択しました！\\n\\nお名前を教えてください 😊\` },
  th: { home: "🏠 หน้าหลัก", homeMsg: "처음으로", error: "เกิดข้อผิดพลาด กรุณาลองใหม่ 😊", calError: "กรุณาเลือกวันที่จากปฏิทินก่อน！📅", calRetry: "✅ เสร็จสิ้น", dateSelected: (dt) => \`📅 เลือก \${dt} แล้ว！\\n\\nกรุณาแจ้งชื่อของคุณ 😊\` },
  vi: { home: "🏠 Trang chủ", homeMsg: "처음으로", error: "Đã xảy ra lỗi. Vui lòng thử lại 😊", calError: "Vui lòng chọn ngày từ lịch trước！📅", calRetry: "✅ Hoàn thành", dateSelected: (dt) => \`📅 Đã chọn \${dt}！\\n\\nCho tôi biết tên của bạn nhé 😊\` },
  ar: { home: "🏠 الرئيسية", homeMsg: "처음으로", error: "حدث خطأ. يرجى المحاولة مرة أخرى 😊", calError: "يرجى اختيار تاريخ من التقويم أولاً！📅", calRetry: "✅ تم", dateSelected: (dt) => \`📅 تم اختيار \${dt}！\\n\\nما اسمك من فضلك؟ 😊\` },
  ru: { home: "🏠 Главная", homeMsg: "처음으로", error: "Произошла ошибка. Попробуйте снова 😊", calError: "Сначала выберите дату в календаре！📅", calRetry: "✅ Готово", dateSelected: (dt) => \`📅 Выбрано \${dt}！\\n\\nКак вас зовут? 😊\` },
  fr: { home: "🏠 Accueil", homeMsg: "처음으로", error: "Une erreur s'est produite. Veuillez réessayer 😊", calError: "Veuillez d'abord sélectionner une date！📅", calRetry: "✅ Terminé", dateSelected: (dt) => \`📅 \${dt} sélectionné！\\n\\nPuis-je avoir votre nom? 😊\` },
  es: { home: "🏠 Inicio", homeMsg: "처음으로", error: "Ocurrió un error. Por favor intente de nuevo 😊", calError: "¡Por favor seleccione una fecha del calendario primero！📅", calRetry: "✅ Listo", dateSelected: (dt) => \`📅 \${dt} seleccionado！\\n\\n¿Me puede dar su nombre? 😊\` }
};
`;

// 파일 상단 router 선언 앞에 LANG_TEXTS 추가
const routerLine = `router.post('/skill', handleMain);`;
if (!content.includes('const LANG_TEXTS')) {
  content = content.replace(routerLine, langTextsConst + '\n' + routerLine);
  console.log('✅ LANG_TEXTS 상수 추가 완료');
}

// =====================
// 날짜선택완료 처리 다국어
// =====================
const oldDateComplete = `    if (userMessage === '날짜선택완료') {
      try {
        const r = await fetch(\`http://localhost:3002/calendar-result/\${kakaoUserId}\`);
        const data = await r.json();
        if (!data.success || !data.datetime) {
          await sendCallback(callbackUrl, "캘린더에서 날짜를 먼저 선택해주세요! 📅",
            [{ label: "✅ 날짜선택완료", action: "message", messageText: "날짜선택완료" }]
          );
          return;
        }
        session.data.date = data.datetime;
        const dateMsg = \`📅 \${data.datetime} 선택하셨습니다!\\n\\n고객님 성함을 알려주세요 😊\`;
        session.history.push({ role: "user", content: \`날짜 \${data.datetime} 선택\` });
        session.history.push({ role: "model", content: dateMsg });
        await sendCallback(callbackUrl, dateMsg);
      } catch(e) {
        await sendCallback(callbackUrl, "오류가 발생했습니다. 다시 시도해주세요 😊");
      }
      return;
    }`;

const newDateComplete = `    if (userMessage === '날짜선택완료') {
      const lt = LANG_TEXTS[session.data.lang] || LANG_TEXTS.ko;
      try {
        const r = await fetch(\`http://localhost:3002/calendar-result/\${kakaoUserId}\`);
        const data = await r.json();
        if (!data.success || !data.datetime) {
          await sendCallback(callbackUrl, lt.calError,
            [{ label: lt.calRetry, action: "message", messageText: "날짜선택완료" }]
          );
          return;
        }
        session.data.date = data.datetime;
        const dateMsg = lt.dateSelected(data.datetime);
        session.history.push({ role: "user", content: \`날짜 \${data.datetime} 선택\` });
        session.history.push({ role: "model", content: dateMsg });
        await sendCallback(callbackUrl, dateMsg, [{ label: lt.home, action: "message", messageText: "처음으로" }]);
      } catch(e) {
        await sendCallback(callbackUrl, lt.error);
      }
      return;
    }`;

if (content.includes(oldDateComplete)) {
  content = content.replace(oldDateComplete, newDateComplete);
  console.log('✅ 날짜선택완료 다국어 완료');
} else {
  console.log('❌ 날짜선택완료 텍스트 못 찾음');
}

// =====================
// 처음으로 버튼 다국어 (Gemini 기본 응답)
// =====================
const oldHomeBtn = `    await sendCallback(callbackUrl, geminiReply.message,
      [{ label: "🏠 처음으로", action: "message", messageText: "처음으로" }]
    );`;

const newHomeBtn = `    const lt2 = LANG_TEXTS[session.data.lang] || LANG_TEXTS.ko;
    await sendCallback(callbackUrl, geminiReply.message,
      [{ label: lt2.home, action: "message", messageText: "처음으로" }]
    );`;

if (content.includes(oldHomeBtn)) {
  content = content.replace(oldHomeBtn, newHomeBtn);
  console.log('✅ Gemini 처음으로 버튼 다국어 완료');
} else {
  console.log('❌ Gemini 처음으로 버튼 텍스트 못 찾음');
}

// =====================
// 전체 오류 메시지 다국어
// =====================
const oldErrMsg = `    await sendCallback(callbackUrl, "잠시 오류가 발생했습니다. 다시 시도해주세요 😊");`;
const newErrMsg = `    const ltErr = LANG_TEXTS[session.data.lang] || LANG_TEXTS.ko;
    await sendCallback(callbackUrl, ltErr.error);`;

if (content.includes(oldErrMsg)) {
  content = content.replace(oldErrMsg, newErrMsg);
  console.log('✅ 전체 오류 메시지 다국어 완료');
} else {
  console.log('❌ 전체 오류 메시지 텍스트 못 찾음');
}

// =====================
// sendBookingMenu 처음으로 버튼 다국어
// =====================
content = content.replace(
  `quickReplies: [{ label: "🏠 처음으로", action: "message", messageText: "처음으로" }]`,
  `quickReplies: [{ label: (LANG_TEXTS[lang] || LANG_TEXTS.ko).home, action: "message", messageText: "처음으로" }]`
);
console.log('✅ sendBookingMenu 처음으로 버튼 다국어 완료');

fs.writeFileSync(file, content, 'utf8');
console.log('✅ 저장 완료');
