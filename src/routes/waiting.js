const express = require('express');
const router = express.Router();
const waiting = require('../services/waiting');

const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || 'admin1234';
const BIZ_NAME = process.env.BIZ_NAME || '부킷메디 병원';

// 세션별 웨이팅 등록 상태 관리
const waitingSession = {}; // userId → { step, people, phone }

function getWaitingSession(userId) {
  if (!waitingSession[userId]) waitingSession[userId] = {};
  return waitingSession[userId];
}

function clearWaitingSession(userId) {
  delete waitingSession[userId];
}

// 관리자 세션
const adminSessions = new Set();

// 대기 현황 캐러셀 생성
function buildQueueCarousel(callbackUrl) {
  const queue = waiting.getQueueAll();
  const activeQueue = queue.filter(e => e.status !== 'cancelled');

  if (activeQueue.length === 0) {
    return {
      version: '2.0',
      template: {
        outputs: [{ simpleText: { text: '📋 현재 대기 중인 손님이 없습니다 😊' } }],
        quickReplies: [
          { label: '🔄 새로고침', action: 'message', messageText: 'admin:현황' },
          { label: '🚪 관리자 종료', action: 'message', messageText: 'admin:종료' }
        ]
      }
    };
  }

  const statusEmoji = {
    waiting: '⏳ 대기중',
    called: '🔔 호출됨',
    arriving: '🏃 곧도착',
    cancelled: '❌ 취소'
  };

  const items = activeQueue.map(e => ({
    title: `${e.id}번 ${statusEmoji[e.status] || e.status}`,
    description: `👥 ${e.people}인 | 📱 ${e.phoneMasked}${e.status === 'cancelled' ? '\n❌ 이 고객님은 대기를 취소하셨습니다' : ''}`,
    buttons: [
      { action: 'message', label: '📋 상세보기', messageText: `admin:상세:${e.id}` }
    ]
  }));

  return {
    version: '2.0',
    template: {
      outputs: [
        { simpleText: { text: `📋 현재 대기 현황\n─────────────────\n총 ${activeQueue.length}팀 대기 중` } },
        { carousel: { type: 'basicCard', items } }
      ],
      quickReplies: [
        { label: '🔔 다음 손님 호출', action: 'message', messageText: 'admin:호출' },
        { label: '🔄 새로고침', action: 'message', messageText: 'admin:현황' },
        { label: '🗑️ 대기열 초기화', action: 'message', messageText: 'admin:초기화' },
        { label: '🚪 관리자 종료', action: 'message', messageText: 'admin:종료' }
      ]
    }
  };
}

// 손님용 웨이팅 처리
async function handleWaiting(userId, utterance, callbackUrl) {
  const ws = getWaitingSession(userId);

  // 순번 확인
  if (utterance === '웨이팅:순번확인') {
    const entry = waiting.getByUserId(userId);
    if (!entry) {
      return {
        version: '2.0',
        template: {
          outputs: [{ simpleText: { text: '등록된 대기 정보가 없습니다.\n웨이팅을 먼저 등록해주세요 😊' } }],
          quickReplies: [
            { label: '⏳ 웨이팅 등록', action: 'message', messageText: '웨이팅등록' },
            { label: '📱 원격 웨이팅', action: 'message', messageText: '원격웨이팅' }
          ]
        }
      };
    }
    const pos = waiting.getMyPosition(entry.phone);

    // 호출됨 상태
    if (entry.status === 'called') {
      return {
        version: '2.0',
        template: {
          outputs: [{ simpleText: { text: `🔔 지금 입장하실 차례입니다!\n가게로 와주세요 😊\n\n실제 서비스에서는 이 순간\n카카오톡 알림이 발송됩니다 📱` } }],
          quickReplies: [
            { label: '🏃 곧 도착이요', action: 'message', messageText: '웨이팅:도착' },
            { label: '❌ 취소할게요', action: 'message', messageText: '웨이팅:취소' }
          ]
        }
      };
    }

    // 취소 상태
    if (entry.status === 'cancelled') {
      return {
        version: '2.0',
        template: {
          outputs: [{ simpleText: { text: '대기가 취소된 상태입니다.\n다시 등록하시겠어요? 😊' } }],
          quickReplies: [
            { label: '⏳ 다시 등록', action: 'message', messageText: '웨이팅등록' }
          ]
        }
      };
    }

    return {
      version: '2.0',
      template: {
        outputs: [{ simpleText: { text: `🎫 현재 ${pos.position}번째 대기 중입니다\n전체 ${pos.total}팀 대기 중 😊\n\n입장 순서가 되면 알림을 보내드릴게요!` } }],
        quickReplies: [
          { label: '🔄 순번 확인', action: 'message', messageText: '웨이팅:순번확인' },
          { label: '❌ 취소할게요', action: 'message', messageText: '웨이팅:취소' },
          { label: '🏠 처음으로', action: 'message', messageText: '처음으로' }
        ]
      }
    };
  }

  // 도착 응답
  if (utterance === '웨이팅:도착') {
    const entry = waiting.getByUserId(userId);
    if (entry) waiting.updateStatus(entry.id, 'arriving');
    return {
      version: '2.0',
      template: {
        outputs: [{ simpleText: { text: '✅ 확인했습니다!\n잠시만 기다려주세요 😊\n곧 안내해 드리겠습니다.' } }],
        quickReplies: [
          { label: '🔄 순번 확인', action: 'message', messageText: '웨이팅:순번확인' }
        ]
      }
    };
  }

  // 취소
  if (utterance === '웨이팅:취소') {
    waiting.cancelByUserId(userId);
    clearWaitingSession(userId);
    return {
      version: '2.0',
      template: {
        outputs: [{ simpleText: { text: '대기가 취소되었습니다.\n다음에 또 방문해주세요 😊' } }],
        quickReplies: [
          { label: '🏠 처음으로', action: 'message', messageText: '처음으로' }
        ]
      }
    };
  }

  // 웨이팅등록 클릭 → 현장/원격 선택 화면
  if (utterance === '웨이팅등록') {
    const existing = waiting.getByUserId(userId);
    if (existing) {
      const pos = waiting.getMyPosition(existing.phone);
      return {
        version: '2.0',
        template: {
          outputs: [{ simpleText: { text: `이미 ${pos?.position || '?'}번째로 대기 중입니다 😊` } }],
          quickReplies: [
            { label: '🔄 순번 확인', action: 'message', messageText: '웨이팅:순번확인' },
            { label: '❌ 취소할게요', action: 'message', messageText: '웨이팅:취소' }
          ]
        }
      };
    }
    return {
      version: '2.0',
      template: {
        outputs: [{ simpleText: { text: '⏳ 웨이팅 등록\n─────────────────\n대기 등록 방식을 선택해주세요 😊' } }],
        quickReplies: [
          { label: '🏠 현장 대기 등록', action: 'message', messageText: '웨이팅:현장' },
          { label: '📱 원격 대기 등록', action: 'message', messageText: '웨이팅:원격' }
        ]
      }
    };
  }

  // 현장/원격 선택 후 인원 입력
  if (utterance === '웨이팅:현장' || utterance === '웨이팅:원격' || utterance === '원격웨이팅') {
    const existing = waiting.getByUserId(userId);
    if (existing) {
      const pos = waiting.getMyPosition(existing.phone);
      return {
        version: '2.0',
        template: {
          outputs: [{ simpleText: { text: `이미 ${pos?.position || '?'}번째로 대기 중입니다 😊` } }],
          quickReplies: [
            { label: '🔄 순번 확인', action: 'message', messageText: '웨이팅:순번확인' },
            { label: '❌ 취소할게요', action: 'message', messageText: '웨이팅:취소' }
          ]
        }
      };
    }
    ws.step = 'people';
    ws.type = (utterance === '웨이팅:원격' || utterance === '원격웨이팅') ? 'remote' : 'onsite';
    const typeLabel = ws.type === 'remote' ? '📱 원격 대기 등록' : '🏠 현장 대기 등록';
    return {
      version: '2.0',
      template: {
        outputs: [{ simpleText: { text: `${typeLabel}\n\n몇 분이서 오시나요? 😊` } }],
        quickReplies: [
          '1인', '2인', '3인', '4인', '5인', '6인', '7인', '8인 이상'
        ].map(p => ({ label: p, action: 'message', messageText: `웨이팅:인원:${p}` }))
      }
    };
  }

  // 인원 선택
  if (utterance.startsWith('웨이팅:인원:')) {
    ws.people = utterance.replace('웨이팅:인원:', '');
    ws.step = 'phone';
    return {
      version: '2.0',
      template: {
        outputs: [{ simpleText: { text: `${ws.people} 선택하셨습니다 😊\n\n연락처를 입력해주세요\n(예: 010-1234-5678)` } }]
      }
    };
  }

  // 전화번호 입력 감지
  if (ws.step === 'phone') {
    const phoneMatch = utterance.replace(/-/g, '').match(/^01[0-9]{8,9}$/);
    if (!phoneMatch) {
      return {
        version: '2.0',
        template: {
          outputs: [{ simpleText: { text: '올바른 전화번호 형식으로 입력해주세요\n(예: 010-1234-5678)' } }]
        }
      };
    }
    const phone = utterance.replace(/-/g, '');
    const entry = waiting.registerWithUserId(userId, phone, ws.people, ws.type || 'onsite');
    const pos = waiting.getMyPosition(phone);
    clearWaitingSession(userId);
    return {
      version: '2.0',
      template: {
        outputs: [{ simpleText: { text: `✅ 웨이팅 등록 완료!\n\n🎫 ${pos.position}번째 대기 중입니다\n전체 ${pos.total}팀 대기 중 😊\n\n입장 순서가 되면 알림을 보내드릴게요!\n그 동안 편하게 진료 안내를 둘러보세요 🏥` } }],
        quickReplies: [
          { label: '🔄 순번 확인', action: 'message', messageText: '웨이팅:순번확인' },
          { label: '❌ 취소할게요', action: 'message', messageText: '웨이팅:취소' },
          { label: '🏥 진료 안내', action: 'message', messageText: '상담하기' },
          { label: '💰 가격 안내', action: 'message', messageText: '가격안내' },
          { label: '🏠 처음으로', action: 'message', messageText: '처음으로' }
        ]
      }
    };
  }

  return null;
}

// 관리자 명령 처리
async function handleAdmin(userId, utterance, callbackUrl) {

  // 관리자 진입
  if (utterance === ADMIN_PASSWORD) {
    adminSessions.add(userId);
    const waitingCount = waiting.getWaitingCount();
    return {
      version: '2.0',
      template: {
        outputs: [{ simpleText: { text: `🔐 관리자 모드입니다 😊\n${BIZ_NAME} 관리자 대시보드\n─────────────────\n현재 대기 ${waitingCount}팀` } }],
        quickReplies: [
          { label: '⏳ 대기자 관리', action: 'message', messageText: 'admin:현황' },
          { label: '📅 예약 현황', action: 'message', messageText: 'admin:예약' },
          { label: '💬 상담 내역', action: 'message', messageText: 'admin:상담' },
          { label: '🚪 관리자 종료', action: 'message', messageText: 'admin:종료' }
        ]
      }
    };
  }

  if (!adminSessions.has(userId)) return null;

  // 대기 현황
  if (utterance === 'admin:현황') {
    return buildQueueCarousel(callbackUrl);
  }

  // 상세보기
  if (utterance.startsWith('admin:상세:')) {
    const id = parseInt(utterance.replace('admin:상세:', ''));
    const queue = waiting.getQueueAll();
    const entry = queue.find(e => e.id === id);
    if (!entry) {
      return {
        version: '2.0',
        template: {
          outputs: [{ simpleText: { text: '해당 대기자를 찾을 수 없습니다.' } }],
          quickReplies: [{ label: '🔄 현황으로', action: 'message', messageText: 'admin:현황' }]
        }
      };
    }

    const statusText = {
      waiting: '⏳ 대기중',
      called: '🔔 호출됨',
      arriving: '🏃 곧 도착',
      cancelled: '❌ 취소'
    };

    const quickReplies = [{ label: '◀ 현황으로', action: 'message', messageText: 'admin:현황' }];

    if (entry.status === 'waiting') {
      quickReplies.unshift({ label: '🔔 이 손님 호출', action: 'message', messageText: `admin:호출:${id}` });
    }
    if (entry.status === 'called' || entry.status === 'arriving') {
      quickReplies.unshift({ label: '✅ 입장 완료', action: 'message', messageText: `admin:입장:${id}` });
      quickReplies.unshift({ label: '❌ 노쇼 처리', action: 'message', messageText: `admin:노쇼:${id}` });
    }
    if (entry.status === 'cancelled') {
      // 취소된 손님은 호출 버튼 없음
    }

    return {
      version: '2.0',
      template: {
        outputs: [{ simpleText: { text: `📋 ${entry.id}번 상세 정보\n─────────────────\n👥 인원: ${entry.people}\n📱 연락처: ${entry.phoneMasked}\n상태: ${statusText[entry.status] || entry.status}${entry.status === 'cancelled' ? '\n\n❌ 이 고객님은 대기를 취소하셨습니다.' : ''}` } }],
        quickReplies
      }
    };
  }

  // 다음 손님 호출 (자동으로 첫번째 waiting)
  if (utterance === 'admin:호출') {
    const next = waiting.getNext();
    if (!next) {
      return {
        version: '2.0',
        template: {
          outputs: [{ simpleText: { text: '대기 중인 손님이 없습니다 😊' } }],
          quickReplies: [{ label: '🔄 현황으로', action: 'message', messageText: 'admin:현황' }]
        }
      };
    }
    waiting.updateStatus(next.id, 'called');
    return {
      version: '2.0',
      template: {
        outputs: [{ simpleText: { text: `🔔 ${next.id}번 손님(${next.phoneMasked}) 호출 완료!\n\n📱 실제 서비스에서는 이 순간\n손님 카카오톡으로 입장 알림이\n자동 발송됩니다!\n\n손님 응답을 기다리는 중...` } }],
        quickReplies: [
          { label: '🔄 현황 새로고침', action: 'message', messageText: 'admin:현황' },
          { label: '📋 상세보기', action: 'message', messageText: `admin:상세:${next.id}` }
        ]
      }
    };
  }

  // 특정 손님 호출
  if (utterance.startsWith('admin:호출:')) {
    const id = parseInt(utterance.replace('admin:호출:', ''));
    const entry = waiting.updateStatus(id, 'called');
    if (!entry) {
      return {
        version: '2.0',
        template: {
          outputs: [{ simpleText: { text: '해당 대기자를 찾을 수 없습니다.' } }],
          quickReplies: [{ label: '🔄 현황으로', action: 'message', messageText: 'admin:현황' }]
        }
      };
    }
    return {
      version: '2.0',
      template: {
        outputs: [{ simpleText: { text: `🔔 ${entry.id}번 손님(${entry.phoneMasked}) 호출 완료!\n\n📱 실제 서비스에서는 이 순간\n손님 카카오톡으로 입장 알림이\n자동 발송됩니다!` } }],
        quickReplies: [
          { label: '🔄 현황 새로고침', action: 'message', messageText: 'admin:현황' }
        ]
      }
    };
  }

  // 입장 완료
  if (utterance.startsWith('admin:입장:')) {
    const id = parseInt(utterance.replace('admin:입장:', ''));
    waiting.updateStatus(id, 'cancelled');
    return {
      version: '2.0',
      template: {
        outputs: [{ simpleText: { text: `✅ ${id}번 손님 입장 완료!\n즐거운 식사 되세요 😊` } }],
        quickReplies: [
          { label: '🔔 다음 손님 호출', action: 'message', messageText: 'admin:호출' },
          { label: '🔄 현황으로', action: 'message', messageText: 'admin:현황' }
        ]
      }
    };
  }

  // 노쇼 처리
  if (utterance.startsWith('admin:노쇼:')) {
    const id = parseInt(utterance.replace('admin:노쇼:', ''));
    waiting.updateStatus(id, 'cancelled');
    return {
      version: '2.0',
      template: {
        outputs: [{ simpleText: { text: `❌ ${id}번 손님 노쇼 처리 완료\n자동으로 다음 손님이 앞으로 당겨집니다.` } }],
        quickReplies: [
          { label: '🔔 다음 손님 호출', action: 'message', messageText: 'admin:호출' },
          { label: '🔄 현황으로', action: 'message', messageText: 'admin:현황' }
        ]
      }
    };
  }

  // 대기열 초기화
  if (utterance === 'admin:초기화') {
    waiting.resetQueue();
    return {
      version: '2.0',
      template: {
        outputs: [{ simpleText: { text: '🗑️ 대기열이 초기화되었습니다.' } }],
        quickReplies: [{ label: '🔄 현황으로', action: 'message', messageText: 'admin:현황' }]
      }
    };
  }

  // 예약 현황 (시연용 더미 데이터)
  if (utterance === 'admin:예약') {
    return {
      version: '2.0',
      template: {
        outputs: [
          { simpleText: { text: `📅 오늘의 예약 현황\n─────────────────\n※ 카카오채널 예약 기준\n(네이버 예약은 네이버 예약\n관리자 페이지에서 확인해주세요)` } },
          { carousel: {
            type: 'basicCard',
            items: [
              { title: '18:00 홍** 4인', description: '🍱 프리미엄 한정식\n📱 ***-1234' },
              { title: '19:00 김** 2인', description: '🥗 런치 한상\n📱 ***-5678' },
              { title: '20:00 박** 6인', description: '👑 궁중 한정식\n📱 ***-9012\n🏮 프라이빗룸 요청' }
            ]
          }}
        ],
        quickReplies: [
          { label: '◀ 대시보드', action: 'message', messageText: ADMIN_PASSWORD },
          { label: '⏳ 대기자 관리', action: 'message', messageText: 'admin:현황' }
        ]
      }
    };
  }

  // 상담 내역 (시연용)
  if (utterance === 'admin:상담') {
    return {
      version: '2.0',
      template: {
        outputs: [{ simpleText: { text: `💬 최근 상담 내역\n─────────────────\n• 프리미엄 한정식 문의 (3건)\n• 프라이빗룸 예약 문의 (2건)\n• 단체예약 문의 (1건)\n• 알레르기 문의 (1건)\n• 기념일 패키지 문의 (2건)\n─────────────────\n총 9건의 상담이 있었습니다 😊` } }],
        quickReplies: [
          { label: '◀ 대시보드', action: 'message', messageText: ADMIN_PASSWORD },
          { label: '⏳ 대기자 관리', action: 'message', messageText: 'admin:현황' }
        ]
      }
    };
  }

  // 관리자 종료
  if (utterance === 'admin:종료') {
    adminSessions.delete(userId);
    return {
      version: '2.0',
      template: {
        outputs: [{ simpleText: { text: '🔐 관리자 모드를 종료합니다.\n감사합니다 😊' } }],
        quickReplies: [
          { label: '🏠 처음으로', action: 'message', messageText: '처음으로' }
        ]
      }
    };
  }

  return null;
}

module.exports = { handleWaiting, handleAdmin, waitingSession, adminSessions };
