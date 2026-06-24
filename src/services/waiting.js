// 웨이팅 대기열 (메모리 기반 - 시연용)
const waitingQueue = [];
let nextId = 1;

// 대기 등록
function register(phone, people, type = 'onsite') {
  const entry = {
    id: nextId++,
    phone,
    phoneMasked: '***-' + phone.slice(-4),
    people,
    type, // onsite | remote
    status: 'waiting', // waiting | called | arriving | cancelled
    createdAt: new Date()
  };
  waitingQueue.push(entry);
  return entry;
}

// 전체 대기열 (취소 제외)
function getQueue() {
  return waitingQueue.filter(e => e.status !== 'cancelled');
}

// 전체 대기열 (취소 포함 - 관리자용)
function getQueueAll() {
  return waitingQueue;
}

// 순번 확인 (전화번호로 조회)
function getMyPosition(phone) {
  const activeQueue = waitingQueue.filter(e => e.status !== 'cancelled');
  const myEntry = activeQueue.find(e => e.phone === phone);
  if (!myEntry) return null;
  const position = activeQueue.findIndex(e => e.phone === phone) + 1;
  return { ...myEntry, position, total: activeQueue.length };
}

// 카카오 userId로 조회
function getByUserId(userId) {
  return waitingQueue.find(e => e.userId === userId && e.status !== 'cancelled');
}

// userId로 등록
function registerWithUserId(userId, phone, people, type = 'onsite') {
  const entry = {
    id: nextId++,
    userId,
    phone,
    phoneMasked: '***-' + phone.slice(-4),
    people,
    type,
    status: 'waiting',
    createdAt: new Date()
  };
  waitingQueue.push(entry);
  return entry;
}

// 상태 변경
function updateStatus(id, status) {
  const entry = waitingQueue.find(e => e.id === id);
  if (entry) entry.status = status;
  return entry;
}

// 다음 대기 손님 (waiting 상태 첫번째)
function getNext() {
  return waitingQueue.find(e => e.status === 'waiting');
}

// 전화번호로 취소
function cancelByPhone(phone) {
  const entry = waitingQueue.find(e => e.phone === phone && e.status !== 'cancelled');
  if (entry) entry.status = 'cancelled';
  return entry;
}

// userId로 취소
function cancelByUserId(userId) {
  const entry = waitingQueue.find(e => e.userId === userId && e.status !== 'cancelled');
  if (entry) entry.status = 'cancelled';
  return entry;
}

// 대기열 초기화 (관리자용)
function resetQueue() {
  waitingQueue.length = 0;
  nextId = 1;
}

// 대기 중인 총 팀 수
function getWaitingCount() {
  return waitingQueue.filter(e => e.status === 'waiting').length;
}


// 순번 미루기 (n번째 뒤로)
function moveBack(userId, n) {
  const activeQueue = waitingQueue.filter(e => e.status !== 'cancelled');
  const myIdx = activeQueue.findIndex(e => e.userId === userId);
  if (myIdx === -1) return null;
  const entry = activeQueue[myIdx];
  const newIdx = Math.min(myIdx + n, activeQueue.length - 1);
  // 실제 waitingQueue에서 위치 변경
  const realIdx = waitingQueue.indexOf(entry);
  const targetEntry = activeQueue[newIdx];
  const targetRealIdx = waitingQueue.indexOf(targetEntry);
  waitingQueue.splice(realIdx, 1);
  waitingQueue.splice(targetRealIdx, 0, entry);
  const newPos = waitingQueue.filter(e => e.status !== 'cancelled').findIndex(e => e.userId === userId) + 1;
  const total = waitingQueue.filter(e => e.status !== 'cancelled').length;
  return { position: newPos, total };
}

module.exports = {
  register,
  registerWithUserId,
  getQueue,
  getQueueAll,
  getMyPosition,
  getByUserId,
  updateStatus,
  getNext,
  cancelByPhone,
  cancelByUserId,
  resetQueue,
  getWaitingCount,
  moveBack
};
