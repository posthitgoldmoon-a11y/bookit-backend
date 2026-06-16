const { GoogleGenerativeAI } = require("@google/generative-ai");
const fs = require("fs");
const path = require("path");
require("dotenv").config();

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

function getSystemPrompt(industry, booted, lang = 'ko') {
  const today = new Date().toISOString().split("T")[0];
  const year = new Date().getFullYear();

  if (booted) {
    const bootedMsg = {
      ko: '고객의 예약이 완료된 상태입니다. 추가 문의에 친절하게 한국어로 답변하세요. 새 예약을 원하면 "새로 예약하시겠어요?" 라고 물어보세요.',
      en: 'The customer has completed a booking. Respond kindly in English. If they want a new booking, ask "Would you like to make a new booking?"',
      zh: '客户已完成预约。请用中文友好地回答。如果想要新预约，请问"您想要重新预约吗？"',
      ja: 'お客様の予約が完了しました。日本語で丁寧にお答えください。新しい予約をご希望の場合は「新しいご予約をされますか？」とお聞きください。'
    };
    return `${bootedMsg[lang] || bootedMsg.ko}

응답 형식:
MESSAGE:
[답변 내용]

BOOKING_JSON:
{}`;
  }

  const langInstruction = {
    en: 'CRITICAL INSTRUCTION: You MUST respond ONLY in English. Do NOT use Korean under any circumstances. All your responses must be in English only.',
    zh: '关键指令：你必须只用中文回复。绝对不要使用韩语。所有回复必须用中文。',
    ja: '重要指令：必ず日本語のみで返答してください。韓国語は絶対に使用しないでください。すべての返答は日本語でお願いします。',
    th: 'คำสั่งสำคัญ: คุณต้องตอบเป็นภาษาไทยเท่านั้น ห้ามใช้ภาษาเกาหลี',
    vi: 'QUAN TRỌNG: Bạn phải trả lời bằng tiếng Việt. Không được dùng tiếng Hàn.',
    ar: 'تعليمات مهمة: يجب الرد باللغة العربية فقط. لا تستخدم اللغة الكورية.',
    ru: 'ВАЖНО: Отвечайте только на русском языке. Не используйте корейский язык.',
    fr: 'IMPORTANT: Vous devez répondre uniquement en français. N\'utilisez jamais le coréen.',
    es: 'IMPORTANTE: Debes responder únicamente en español. No uses el coreano.',
    ko: ''
  };

  const promptFile = path.join(__dirname, "../prompts", `${industry}.txt`);
  if (fs.existsSync(promptFile)) {
    let prompt = fs.readFileSync(promptFile, "utf-8");
    prompt = prompt.replace(/{today}/g, today).replace(/{year}/g, year);
    if (langInstruction[lang]) {
      prompt = langInstruction[lang] + '\n\n' + prompt;
    }
    return prompt;
  }

  // 프롬프트 파일 없으면 기본 프롬프트
  return `당신은 ${industry} 예약 챗봇입니다. 친절하게 예약을 도와주세요.
오늘은 ${today}입니다.

응답 형식:
MESSAGE:
[메시지]

BOOKING_JSON:
{}`;
}

async function chat(conversationHistory, userMessage, booted = false, industry = "hospital_companion", lang = 'ko') {
  const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash" });

  const systemPrompt = getSystemPrompt(industry, booted, lang);

  const contents = [];
  for (const msg of conversationHistory) {
    contents.push({ role: msg.role, parts: [{ text: msg.content }] });
  }
  contents.push({ role: "user", parts: [{ text: userMessage }] });

  const langSystemInstruction = {
    en: 'CRITICAL: You are an English-speaking assistant. You MUST respond ONLY in English. Never use Korean. Always respond in English regardless of the system prompt language.',
    zh: '关键：你必须只用中文回复。无论系统提示用什么语言，始终用中文回复。',
    ja: '重要：必ず日本語のみで返答してください。システムプロンプトの言語に関係なく、常に日本語で返答してください。',
    th: 'สำคัญ: คุณต้องตอบเป็นภาษาไทยเท่านั้น ไม่ว่าภาษาของ system prompt จะเป็นอะไร',
    vi: 'QUAN TRỌNG: Luôn trả lời bằng tiếng Việt, bất kể ngôn ngữ của system prompt.',
    ar: 'مهم: يجب الرد باللغة العربية فقط بغض النظر عن لغة النظام.',
    ru: 'ВАЖНО: Всегда отвечайте только на русском языке, независимо от языка системного промпта.',
    fr: 'IMPORTANT: Répondez toujours uniquement en français, quelle que soit la langue du prompt système.',
    es: 'IMPORTANTE: Responde siempre únicamente en español, independientemente del idioma del prompt del sistema.',
    ko: ''
  };

  const finalSystemInstruction = langSystemInstruction[lang] 
    ? langSystemInstruction[lang] + '\n\n' + systemPrompt 
    : systemPrompt;

  const result = await model.generateContent({
    systemInstruction: finalSystemInstruction,
    contents: contents
  });

  const text = result.response.text().trim();
  require("fs").appendFileSync("/home/ubuntu/gemini_debug.log", text + "\n===\n");

  const messageMatch = text.match(/MESSAGE:\s*([\s\S]*?)(?=BOOKING_JSON:|SHOW_CALENDAR:|SHOW_BOOKING_TYPE:|SHOW_DOCTORS:|SHOW_PRICE:|HUMAN_AGENT_REQUEST:|RESET:|$)/);
  const jsonMatch = text.match(/BOOKING_JSON:\s*(\{[\s\S]*\})/);
  const showCalendar = /SHOW_CALENDAR:\s*true/i.test(text);
  const humanAgentRequest = text.includes("HUMAN_AGENT_REQUEST: true");
  const reset = text.includes("RESET: true");
  const showCalendarRetry = /SHOW_CALENDAR_RETRY:\s*true/i.test(text);
  const showPrice = text.includes("SHOW_PRICE: true");
  const showDoctors = text.includes("SHOW_DOCTORS: true");
  const showBookingType = text.includes("SHOW_BOOKING_TYPE: true");

  let message;
  if (messageMatch) {
    message = messageMatch[1].trim();
  } else {
    message = text.split("BOOKING_JSON:")[0].trim();
    if (!message) message = text;
  }
  message = message.replace(/SHOW_BUTTONS:.*$/gm, "").replace(/HUMAN_AGENT_REQUEST:.*$/gm, "").replace(/SHOW_STYLISTS:.*$/gm, "").replace(/SHOW_PRICE:.*$/gm, "").replace(/SHOW_DOCTORS:.*$/gm, "").replace(/SHOW_CALENDAR:.*$/gm, "").replace(/SHOW_CALENDAR_RETRY:.*$/gm, "").replace(/SHOW_BOOKING_TYPE:.*$/gm, "").replace(/SHOW_PRICE:.*$/gm, "").replace(/RESET:.*$/gm, "").replace(/SHOW_BOOKING_TYPE:.*$/gm, "").replace(/RESET:.*$/gm, "").trim();

  let bookingData = null;
  if (jsonMatch) {
    try {
      bookingData = JSON.parse(jsonMatch[1].trim());
    } catch (e) {
      console.error("JSON 파싱 오류:", e.message);
    }
  }

  return { message, bookingData, showCalendar, showCalendarRetry, humanAgentRequest, reset,
    showPrice,
    showDoctors, showBookingType };
}

module.exports = { chat };
// 임시 디버그 - 나중에 삭제
