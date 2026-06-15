const fs = require('fs');
const file = '/home/ubuntu/bookit-backend/src/routes/webhook.js';
let content = fs.readFileSync(file, 'utf8');

const oldWelcome = `async function showWelcome(callbackUrl) {
  console.log('showWelcome 시작');
  // 세션 초기화 방지
  try {
    const bannerUrl = \`\${BASE_URL}/banner_hospital.jpg\`;
    const payload = {
      version: "2.0",
      template: {
        outputs: [
          { basicCard: {
            title: "✨ 연세푸르미피부과",
            description: "강남 대표 피부과 | 개원 20년",
            thumbnail: { imageUrl: bannerUrl, fixedRatio: false }
          }},
          { simpleText: { text: "안녕하세요! 연세푸르미피부과입니다 😊\\n\\n👨‍⚕️ 피부과 전문의 3인 운영\\n🏆 강남 레이저  시술 1위 병원\\n🌍 외국인 다국어 상담 가능\\n💡 첫 방문 고객 무료 피부 분석\\n\\n무엇을 도와드릴까요?" } }
        ],
        quickReplies: mainQuickReplies
      }
    };`;

const newWelcome = `async function showWelcome(callbackUrl, lang = 'ko') {
  console.log('showWelcome 시작');
  try {
    const bannerUrl = \`\${BASE_URL}/banner_hospital.jpg\`;
    const welcomeTexts = {
      ko: "안녕하세요! 연세푸르미피부과입니다 😊\\n\\n👨‍⚕️ 피부과 전문의 3인 운영\\n🏆 강남 레이저 시술 1위 병원\\n🌍 외국인 다국어 상담 가능\\n💡 첫 방문 고객 무료 피부 분석\\n\\n무엇을 도와드릴까요?",
      en: "Hello! Welcome to Yonsei Purumi Skin Clinic 😊\\n\\n👨‍⚕️ 3 specialist doctors\\n🏆 #1 Laser clinic in Gangnam\\n🌍 Multilingual consultation\\n💡 Free skin analysis for first visit\\n\\nHow can we help you?",
      zh: "您好！欢迎来到延世푸르미皮肤科 😊\\n\\n👨‍⚕️ 3位专业皮肤科医生\\n🏆 江南激光治疗第一\\n🌍 多语言咨询\\n💡 首次就诊免费皮肤分析\\n\\n请问有什么可以帮您？",
      ja: "こんにちは！延世プルミ皮膚科へようこそ 😊\\n\\n👨‍⚕️ 皮膚科専門医3名\\n🏆 江南レーザー施術No.1\\n🌍 多言語対応\\n💡 初回無料肌分析\\n\\nどのようなご用件でしょうか？",
      th: "สวัสดี! ยินดีต้อนรับสู่คลินิกผิวหนัง Yonsei Purumi 😊\\n\\n👨‍⚕️ แพทย์ผิวหนัง 3 ท่าน\\n🏆 คลินิกเลเซอร์อันดับ 1 ใน Gangnam\\n🌍 ให้คำปรึกษาหลายภาษา\\n💡 วิเคราะห์ผิวฟรีสำหรับการเยี่ยมชมครั้งแรก\\n\\nเราช่วยอะไรคุณได้บ้าง?",
      vi: "Xin chào! Chào mừng đến với Phòng khám da Yonsei Purumi 😊\\n\\n👨‍⚕️ 3 bác sĩ chuyên khoa da liễu\\n🏆 Phòng khám laser #1 ở Gangnam\\n🌍 Tư vấn đa ngôn ngữ\\n💡 Phân tích da miễn phí cho lần đầu\\n\\nChúng tôi có thể giúp gì cho bạn?",
      ar: "مرحباً! أهلاً بكم في عيادة يونسي بوروري للجلدية 😊\\n\\n👨‍⚕️ 3 أطباء متخصصون\\n🏆 عيادة الليزر الأولى في غانغنام\\n🌍 استشارة متعددة اللغات\\n💡 تحليل مجاني للبشرة للزيارة الأولى\\n\\nكيف يمكننا مساعدتك؟",
      ru: "Здравствуйте! Добро пожаловать в клинику Yonsei Purumi 😊\\n\\n👨‍⚕️ 3 врача-дерматолога\\n🏆 Клиника лазерного лечения №1 в Каннаме\\n🌍 Консультация на нескольких языках\\n💡 Бесплатный анализ кожи для первого визита\\n\\nЧем мы можем помочь?",
      fr: "Bonjour! Bienvenue à la Clinique de peau Yonsei Purumi 😊\\n\\n👨‍⚕️ 3 médecins spécialistes\\n🏆 Clinique laser #1 à Gangnam\\n🌍 Consultation multilingue\\n💡 Analyse de peau gratuite pour la première visite\\n\\nComment pouvons-nous vous aider?",
      es: "¡Hola! Bienvenido a la Clínica de piel Yonsei Purumi 😊\\n\\n👨‍⚕️ 3 médicos especialistas\\n🏆 Clínica láser #1 en Gangnam\\n🌍 Consulta multilingüe\\n💡 Análisis de piel gratis para primera visita\\n\\n¿En qué podemos ayudarte?"
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
    };`;

if (content.includes(oldWelcome)) {
  content = content.replace(oldWelcome, newWelcome);
  fs.writeFileSync(file, content, 'utf8');
  console.log('✅ showWelcome 다국어 완료');
} else {
  console.log('❌ 텍스트를 찾지 못함');
}

// showWelcome 호출 시 lang 전달
content = fs.readFileSync(file, 'utf8');
content = content.replace(
  `await showWelcome(callbackUrl);
      return;
    }

    if (langMap[userMessage]) {`,
  `await showWelcome(callbackUrl);
      return;
    }

    if (langMap[userMessage]) {`
);

// 언어 선택 후 showWelcome에 lang 전달
content = content.replace(
  `await showWelcome(callbackUrl);
      }
      return;
    }

    if (userMessage === "언어선택")`,
  `await showWelcome(callbackUrl, session.data.lang);
      }
      return;
    }

    if (userMessage === "언어선택")`
);

// 리셋 시 showWelcome 호출
content = content.replace(
  `session.booted = true;
      await showWelcome(callbackUrl);
      return;
    }

    if (!session.visited)`,
  `session.booted = true;
      await showWelcome(callbackUrl, session.data.lang || 'ko');
      return;
    }

    if (!session.visited)`
);

fs.writeFileSync(file, content, 'utf8');
console.log('✅ showWelcome lang 파라미터 전달 완료');
