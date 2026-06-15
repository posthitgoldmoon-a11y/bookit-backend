const { chat } = require('./src/services/gemini.js');

async function test() {
  try {
    const result = await chat([], "I have acne and pore concerns", false, 'hospital', 'en');
    console.log('응답:', result.message);
  } catch(e) {
    console.error('에러:', e.message);
  }
}
test();
