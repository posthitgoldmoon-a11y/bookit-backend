const fs = require('fs');
const file = '/home/ubuntu/bookit-backend/src/routes/webhook.js';
let lines = fs.readFileSync(file, 'utf8').split('\n');

// showWelcome 함수 찾기
let startLine = -1, endLine = -1, braceCount = 0, started = false;
for (let i = 0; i < lines.length; i++) {
  if (lines[i].includes('async function showWelcome')) {
    startLine = i;
    started = true;
  }
  if (started) {
    for (const ch of lines[i]) {
      if (ch === '{') braceCount++;
      if (ch === '}') braceCount--;
    }
    if (braceCount === 0 && i > startLine) {
      endLine = i;
      break;
    }
  }
}
console.log(`showWelcome: ${startLine+1}~${endLine+1}번째 줄`);

const newFunc = `async function showWelcome(callbackUrl, lang = 'ko') {
  console.log('showWelcome 시작');
  try {
    const bannerUrl = \`\${BASE_URL}/banner_hospital.jpg\`;
    const welcomeTexts = {
      ko: "안녕하세요! 연세푸르미피부과입니다 😊\\n\\n👨‍⚕️ 피부과 전문의 3인 운영\\n🏆 강남 레이저 시술 1위 병원\\n🌍 외국인 다국어 상담 가능\\n💡 첫 방문 고객 무료 피부 분석\\n\\n무엇을 도와드릴까요?",
      en: "Hello! Welcome to Yonsei Purumi Skin Clinic 😊\\n\\n👨‍⚕️ 3 specialist doctors\\n🏆 #1 Laser clinic in Gangnam\\n🌍 Multilingual consultation\\n💡 Free skin analysis for first visit\\n\\nHow can we help you?",
      zh: "您好！欢迎来到延世푸르미皮肤科 😊\\n\\n👨‍⚕️ 3位专业皮肤科医生\\n🏆 江南激光治疗第一\\n🌍 多语言咨询\\n💡 首次就诊免费皮肤分析\\n\\n请问有什么可以帮您？",
      ja: "こんにちは！延世プルミ皮膚科へようこそ 😊\\n\\n👨‍⚕️ 皮膚科専門医3名\\n🏆 江南レーザー施術No.1\\n🌍 多言語対応\\n💡 初回無料肌分析\\n\\nどのようなご用件でしょうか？",
      th: "สวัสดี! ยินดีต้อนรับสู่คลินิก Yonsei Purumi 😊\\n\\n👨‍⚕️ แพทย์ผิวหนัง 3 ท่าน\\n🏆 คลินิกเลเซอร์อันดับ 1\\n🌍 ให้คำปรึกษาหลายภาษา\\n💡 วิเคราะห์ผิวฟรีครั้งแรก\\n\\nเราช่วยอะไรคุณได้บ้าง?",
      vi: "Xin chào! Chào mừng đến với Yonsei Purumi 😊\\n\\n👨‍⚕️ 3 bác sĩ chuyên khoa\\n🏆 Phòng khám laser #1 Gangnam\\n🌍 Tư vấn đa ngôn ngữ\\n💡 Phân tích da miễn phí lần đầu\\n\\nChúng tôi có thể giúp gì?",
      ar: "مرحباً! أهلاً بكم في عيادة يونسي 😊\\n\\n👨‍⚕️ 3 أطباء متخصصون\\n🏆 عيادة الليزر الأولى\\n🌍 استشارة متعددة اللغات\\n💡 تحليل مجاني للبشرة\\n\\nكيف يمكننا مساعدتك؟",
      ru: "Здравствуйте! Добро пожаловать в Yonsei Purumi 😊\\n\\n👨‍⚕️ 3 врача-дерматолога\\n🏆 Клиника №1 в Каннаме\\n🌍 Консультация на нескольких языках\\n💡 Бесплатный анализ кожи\\n\\nЧем мы можем помочь?",
      fr: "Bonjour! Bienvenue à Yonsei Purumi 😊\\n\\n👨‍⚕️ 3 médecins spécialistes\\n🏆 Clinique laser #1 à Gangnam\\n🌍 Consultation multilingue\\n💡 Analyse de peau gratuite\\n\\nComment pouvons-nous vous aider?",
      es: "¡Hola! Bienvenido a Yonsei Purumi 😊\\n\\n👨‍⚕️ 3 médicos especialistas\\n🏆 Clínica láser #1 en Gangnam\\n🌍 Consulta multilingüe\\n💡 Análisis de piel gratis\\n\\n¿En qué podemos ayudarte?"
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
}`;

lines.splice(startLine, endLine - startLine + 1, ...newFunc.split('\n'));
fs.writeFileSync(file, lines.join('\n'), 'utf8');
console.log('✅ showWelcome 교체 완료');

// showWelcome 호출 시 lang 전달
let content = fs.readFileSync(file, 'utf8');
content = content.replace(
  `await showWelcome(callbackUrl);\n      }\n      return;\n    }\n\n    if (userMessage === "언어선택")`,
  `await showWelcome(callbackUrl, session.data.lang || 'ko');\n      }\n      return;\n    }\n\n    if (userMessage === "언어선택")`
);
fs.writeFileSync(file, content, 'utf8');
console.log('✅ lang 파라미터 전달 완료');
