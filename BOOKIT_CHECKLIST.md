# BOOKIT 운영 체크리스트
Updated: 2026-06-17

---

## 디렉토리-채널 매핑 (절대 혼동 금지)
| 디렉토리 | 포트 | 채널명 | 실사용처 | GitHub |
|---|---|---|---|---|
| bookit-backend | 3002 | 부킷메디 | 연세푸르미피부과 (라이브) | bookit-backend |
| donworry-backend | 3003 | 부킷 | 20개 데모 업종 | bookit-all |
| hospital-companion-backend | 3000 | 돈워리 병원동행 | 미사용 | hospital-companion-backend |
| gourmet-backend | 3005 | 부킷고멧 | 온기담 한정식 | bookit-gourmet |
| beauty-backend | 3006 | 부킷뷰티 | 세라마이드헤어 | bookit-beauty |

---

## 카카오 스킬 URL (절대 변경 금지)
- 부킷메디: http://158.180.83.78:3002/webhook/skill
- 부킷: http://158.180.83.78:3003/webhook
- 돈워리: http://158.180.83.78:3000/webhook
- 부킷메디 데모: http://158.180.83.78:3002/chat-demo
- 부킷고멧: http://158.180.83.78:3005/webhook/skill

---

## SSH 접속
ssh -i "F:\병원동행\ssh-key-2026-06-09.key" ubuntu@158.180.83.78

---

## GitHub 레포
- bookit-backend: https://github.com/posthitgoldmoon-a11y/bookit-backend
- bookit-gourmet: https://github.com/posthitgoldmoon-a11y/bookit-gourmet

---

## 새 병원 채널 이식 프로세스 (bookit-backend 기반)
※ webhook.js 절대 수정 불필요 - hospital.txt 만 교체하면 끝!

### 1단계: 디렉토리 복사
cp -r ~/bookit-backend ~/새병원명-backend
cd ~/새병원명-backend

### 2단계: .env 수정
nano .env
PORT=새포트번호
TELEGRAM_BOT_TOKEN=새토큰
TELEGRAM_CHAT_ID=새채팅ID

### 3단계: hospital.txt 교체 (핵심!)
nano src/prompts/hospital.txt

반드시 포함할 항목:
- 상호: 병원명
- 위치: 주소
- 진료시간:
- 주차:
- 전화:

의료진 섹션:
## 의료진
- 홍길동 원장 - 전문분야 N년, 특기

## 환영 메시지
안녕하세요! [병원명]입니다 😊
[병원 소개 4줄]
무엇을 도와드릴까요?

카드 섹션 (4개 필수):
## 카드_예약메뉴
[이모지] [시술명] | [설명\n가격] | [버튼클릭시 전송할 텍스트]
예시) 💉 레이저 시술 | 토닝·색소·제모\n80,000원~300,000원 | 레이저 시술 예약하기

## 카드_상담메뉴
[이모지] [항목명] | [설명\n부가설명] | [버튼클릭시 전송할 텍스트]
예시) 🔬 피부 고민 상담 | 여드름·색소·주름\n맞춤 솔루션 | 피부 고민 상담해주세요

## 카드_가격메뉴
[이모지] [시술명] | [가격 상세\n추가정보]
예시) 💉 레이저 시술 | 토닝 1회 80,000원\n5회 350,000원

## 카드_의료진
[원장명] | [전문분야\n경력\n특기] | [버튼클릭시 전송할 텍스트] | [이미지파일명]
예시) 김연세 원장 | 피부과 전문의 20년\n레이저 전문 | 김연세 원장으로 예약하기 | doctor_1.jpg

영어 카드 섹션 (다국어 필요시 추가):
## 카드_예약메뉴_en
## 카드_상담메뉴_en
## 카드_가격메뉴_en
## 카드_의료진_en

### 4단계: 문법 확인 및 PM2 시작
node --check src/routes/webhook.js
pm2 start src/app.js --name 새병원명
pm2 save

### 5단계: OCI 방화벽 포트 오픈 (응답 없으면 반드시 확인!)
1. https://cloud.oracle.com 접속
2. Networking → Virtual Cloud Networks → VCN 선택
3. Security Lists → Default Security List → Ingress Rules → Add Ingress Rule
   Source CIDR: 0.0.0.0/0
   IP Protocol: TCP
   Source Port Range: (비움)
   Destination Port Range: 새포트번호
   Description: 새병원명
4. Save Changes

### 6단계: iptables 포트 오픈
sudo iptables -I INPUT -p tcp --dport 새포트번호 -j ACCEPT

### 7단계: 포트 확인
ss -tlnp | grep 새포트번호

### 8단계: 로컬 테스트
curl -s -X POST http://localhost:새포트번호/webhook/skill \
  -H "Content-Type: application/json" \
  -d '{"userRequest":{"utterance":"안녕","user":{"id":"test1"}},"bot":{"id":"test"}}' | python3 -m json.tool
정상응답: {"version":"2.0","useCallback":true}

### 9단계: 카카오 어드민 스킬 등록
1. https://developers.kakao.com 접속
2. 스킬 목록 → 새 스킬 추가
3. 스킬 URL: http://158.180.83.78:새포트번호/webhook/skill
4. 폴백 블록에 스킬 연결
5. 배포 클릭

### 10단계: GitHub 연결 및 푸시
git remote set-url origin https://github.com/posthitgoldmoon-a11y/새레포명.git
git add -A && git commit -m "init: 새병원 초기 세팅" && git push

---

## 새 식당 채널 이식 프로세스 (gourmet-backend 기반)
※ webhook.js 절대 수정 불필요 - restaurant.txt 만 교체하면 끝!

### 1단계: 디렉토리 복사
cp -r ~/gourmet-backend ~/새식당명-backend
cd ~/새식당명-backend

### 2단계: .env 수정
nano .env
PORT=새포트번호
TELEGRAM_BOT_TOKEN=새토큰
TELEGRAM_CHAT_ID=새채팅ID

### 3단계: restaurant.txt 교체 (핵심!)
nano src/prompts/restaurant.txt

반드시 포함할 항목:
- 상호: 식당명
- 위치: 주소
- 영업시간:
- 주차:
- 전화:

## 환영 메시지
안녕하세요! [식당명]입니다 😊
[식당 소개 4줄]
무엇을 도와드릴까요?

카드 섹션 (3개 필수):
## 카드_예약메뉴
[이모지] [메뉴명] | [설명\n가격] | [버튼클릭시 전송할 텍스트]
예시) 🥗 런치 한상 | 평일 11:30~14:30\nA코스 35,000원 | 런치 한상 예약하기

## 카드_상담메뉴
[이모지] [항목명] | [설명\n부가설명] | [버튼클릭시 전송할 텍스트]
예시) 🍽️ 메뉴 추천 | 오늘의 추천 메뉴\n코스 요리 안내 | 메뉴 추천해주세요

## 카드_가격메뉴
[이모지] [메뉴명] | [설명\n가격]
예시) 🥗 런치 한상 | 평일 11:30~14:30\nA코스 35,000원

영어 카드 섹션 (다국어 필요시 추가):
## 카드_예약메뉴_en
## 카드_상담메뉴_en
## 카드_가격메뉴_en

### 4단계~10단계: 위 병원 프로세스 4~10단계 동일

---

## 채널 응답 없을 때 트러블슈팅 순서
1. PM2 상태: pm2 list
2. 포트 확인: ss -tlnp | grep 포트번호
3. 로컬 curl 테스트
4. OCI 방화벽 확인 ← 가장 흔한 원인!
5. 로그 확인: pm2 logs 채널명 --lines 30 --nostream

---

## PM2 명령어
pm2 list
pm2 logs 채널명 --lines 20 --nostream
pm2 restart 채널명 --update-env
pm2 flush 채널명
pm2 save

---

## 포트 전체 확인
ss -tlnp | grep -E "3000|3001|3002|3003|3005"

---

## 파일 수정 규칙 (반드시 준수)
- 절대 > 로 덮어쓰기 금지, >> 로 추가
- 수정 전 백업: cp file file.bak
- git commit 먼저
- 수정 후 node --check 실행
- pm2 restart로 반영

---

## 복구 방법
git log --oneline
git show <commitID>:<파일경로> > /tmp/backup.js
cp /tmp/backup.js <파일경로>

---

## 요금제
- 병원 한국어: 149,000원 / 10개 언어: 390,000원
- 식당·미용 등 한국어: 49,000원 / 10개 언어: 99,000원

---

## 20개 데모 업종 목록
돈워리 병원동행, 연세푸르미피부과, 온기담 한정식, 세라마이드헤어, 블루문호텔,
젠힐링마사지, 퀵무브공항택시, 해피포동물병원, 청량사 템플스테이, 글로우피부관리,
그린벨리 골프클럽, 드라이브온 렌트카, 어드벤처존, 파워핏, 파티하우스,
네일로그, 모멘트스튜디오, 포커스존, 바디앤마인드요가, 에어로핏 수영장

## beauty-backend 추가 (2026-06-18)
| beauty-backend | 3006 | 부킷뷰티 | 세라마이드헤어 |
- webhook URL: https://chat.bookit.ai.kr/beauty/webhook
- GitHub: https://github.com/posthitgoldmoon-a11y/bookit-beauty

---

## beauty-backend 추가 (2026-06-18)
| 디렉토리 | 포트 | 채널명 | 실사용처 |
|---|---|---|---|
| beauty-backend | 3006 | 부킷뷰티 | 세라마이드헤어 |

- webhook URL: https://chat.bookit.ai.kr/beauty/webhook
- 스킬 URL: http://158.180.83.78:3006/webhook/skill
- GitHub: https://github.com/posthitgoldmoon-a11y/bookit-beauty
- nginx: /beauty/ 경로 추가 완료


## 2026-06-18 작업 내역
### 무료체험 신청 버튼 추가 (전 채널)
- 모든 응답(예약/상담/의료진/Gemini)에 🎁 무료체험 신청 버튼 추가
- 전화번호 패턴 감지 (010-XXXX-XXXX) 및 텔레그램 알림 전송
- bookit-backend, bookit-gourmet, bookit-beauty, bookit-all 모두 적용

### 텔레그램 그룹 알림 설정
- TELEGRAM_CHAT_ID=-5509780881 (Bookit 관리자방)
- 전 채널 적용 완료

### GitHub 레포 매핑 확정
| 디렉토리 | 포트 | 카카오 채널 | GitHub |
|---|---|---|---|
| bookit-backend | 3002 | 부킷메디 | bookit-backend |
| donworry-backend | 3003 | 부킷 (20개 데모) | bookit-all |
| hospital-companion-backend | 3000 | 돈워리 병원동행 | hospital-companion-backend |
| gourmet-backend | 3005 | 부킷고멧 | bookit-gourmet |
| beauty-backend | 3006 | 부킷뷰티 | bookit-beauty |

### 부킷 채널 (donworry) 카카오채널 예약 흐름 복원
- 카카오채널예약 클릭 → 캘린더 표시
- 날짜선택완료 → 이름 → 전화번호 → 텔레그램 알림
- getBookingCard 카카오 버튼 webLink→message 수정

## GitHub 레포 최종 매핑 (중요!)
| 디렉토리 | GitHub 레포 | 용도 |
|---|---|---|
| bookit-backend | bookit-backend | 부킷메디 + 체크리스트 + 일괄배포스크립트 |
| gourmet-backend | bookit-gourmet | 부킷고멧 |
| beauty-backend | bookit-beauty | 부킷뷰티 |
| donworry-backend | bookit-all | 부킷 (20개 데모) |

## 중요 파일 위치
- 체크리스트: ~/bookit-backend/BOOKIT_CHECKLIST.md
- 일괄배포 스크립트: ~/bookit-backend/deploy_all.sh
- 세션 시작 시 반드시 확인: cat ~/bookit-backend/BOOKIT_CHECKLIST.md

## 작업 전 필수 확인
1. 어떤 채널 작업인지 먼저 확인
2. 작업 전 디렉토리 확인: pwd
3. 새 채널 만들 때: cp -r ~/bookit-backend ~/새채널명-backend
4. 기존 채널 디렉토리에서 다른 채널 작업 절대 금지

## 디렉토리-채널-GitHub 매핑
- bookit-backend / 부킷메디 / 포트3002 / GitHub:bookit-backend
- gourmet-backend / 부킷고멧 / 포트3005 / GitHub:bookit-gourmet
- beauty-backend / 부킷뷰티 / 포트3006 / GitHub:bookit-beauty
- donworry-backend / 부킷데모 / 포트3003 / GitHub:bookit-all
- hospital-companion-backend / 돈워리 / 포트3000 / GitHub:hospital-companion-backend

## 중요 파일 위치
- 체크리스트: ~/bookit-backend/BOOKIT_CHECKLIST.md
- 일괄배포: ~/bookit-backend/deploy_all.sh

## ⚠️ 작업 전 필수 확인 (매 세션 시작 시 반드시 확인!)
1. 어떤 채널 작업인지 먼저 확인
2. 작업 전 디렉토리 확인: pwd
3. 새 채널 만들 때: cp -r ~/bookit-backend ~/새채널명-backend (절대 기존 채널 디렉토리 사용 금지)
4. 기존 채널 디렉토리에서 다른 채널 작업 절대 금지

## 디렉토리-채널-GitHub 매핑 (절대 혼동 금지!)
| 디렉토리 | 채널명 | 포트 | GitHub |
|---|---|---|---|
| bookit-backend | 부킷메디 | 3002 | bookit-backend |
| gourmet-backend | 부킷고멧 | 3005 | bookit-gourmet |
| beauty-backend | 부킷뷰티 | 3006 | bookit-beauty |
| donworry-backend | 부킷(데모) | 3003 | bookit-all |
| hospital-companion-backend | 돈워리병원동행 | 3000 | hospital-companion-backend |

## 중요 파일 위치
- 체크리스트: ~/bookit-backend/BOOKIT_CHECKLIST.md
- 일괄배포 스크립트: ~/bookit-backend/deploy_all.sh
- 세션 시작 시 반드시: cat ~/bookit-backend/BOOKIT_CHECKLIST.md
