const fs = require('fs');
const file = '/home/ubuntu/bookit-backend/src/routes/webhook.js';
let lines = fs.readFileSync(file, 'utf8').split('\n');

// 395~410 범위에서 sendCallback 오시는길 블록 찾기
let sendStart = -1;
for (let i = 390; i < 415; i++) {
  if (lines[i] && lines[i].includes('await sendCallback(callbackUrl,') && 
      lines[i+1] && lines[i+1].includes('dirTexts')) {
    sendStart = i;
    break;
  }
}

if (sendStart === -1) {
  console.log('❌ sendCallback 블록 못 찾음');
  lines.forEach((l,i) => { if(l.includes('dirTexts[lang]')) console.log(i+1, l); });
  process.exit(1);
}

// 블록 끝 찾기 (');' 줄)
let sendEnd = -1;
for (let i = sendStart; i < sendStart + 10; i++) {
  if (lines[i] && lines[i].trim() === ');') {
    sendEnd = i;
    break;
  }
}

console.log(`오시는길 sendCallback: ${sendStart+1}~${sendEnd+1}줄`);

const newBlock = [
  `      await sendCallback(callbackUrl,`,
  `        dirTexts[lang] || dirTexts.ko,`,
  `        getQuickReplies(lang),`,
  `        [`,
  `          { action: 'webLink', label: mapLabels[lang] || mapLabels.ko, webLinkUrl: 'https://map.kakao.com/?q=강남역피부과' },`,
  `          { action: 'message', label: lt.home, messageText: '처음으로' }`,
  `        ]`,
  `      );`
];

lines.splice(sendStart, sendEnd - sendStart + 1, ...newBlock);
fs.writeFileSync(file, lines.join('\n'), 'utf8');
console.log('✅ 오시는길 버튼 수정 완료');
