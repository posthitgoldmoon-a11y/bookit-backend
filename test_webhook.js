const fetch = (...args) => import('node-fetch').then(({default: fetch}) => fetch(...args));

async function test() {
  const BASE_URL = 'http://158.180.83.78:3002';
  const bannerUrl = `${BASE_URL}/banner_hospital.jpg`;
  
  try {
    const result = await fetch('https://httpbin.org/post', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        version: "2.0",
        template: {
          outputs: [
            { basicCard: {
              title: "✨ 연세푸르미피부과",
              description: "강남 대표 피부과",
              thumbnail: { imageUrl: bannerUrl, fixedRatio: false },
              buttons: [
                { action: "message", label: "📅 예약하기", messageText: "예약하기" }
              ]
            }},
            { simpleText: { text: "안녕하세요!" } }
          ],
          quickReplies: [
            { label: "📅 예약하기", action: "message", messageText: "예약하기" }
          ]
        }
      })
    });
    const data = await result.json();
    console.log('✅ 성공! JSON 전송 정상');
  } catch(e) {
    console.error('❌ 에러:', e.message);
  }
}

test();
