# 카카오 챗봇 개발 가이드 (연세푸르미피부과)

## 📁 프로젝트 구조
- ~/bookit-backend/src/app.js : Express 서버, 포트 3002
- ~/bookit-backend/src/routes/webhook.js : 카카오 웹훅 메인 로직
- ~/bookit-backend/src/services/gemini.js : Gemini AI 연동
- ~/bookit-backend/public/calendar.html : 날짜선택 캘린더 UI
- ~/bookit-backend/public/doctor_1.jpg : 김연세 원장
- ~/bookit-backend/public/doctor_2.jpg : 박푸르미 원장
- ~/bookit-backend/public/doctor_3.jpg : 이미소 원장
- ~/bookit-backend/src/prompts/hospital.txt : Gemini 시스템 프롬프트

## 🚀 서버 실행/관리
- pm2 list : 서버 상태 확인
- pm2 restart bookit --update-env : 재시작
- pm2 logs bookit --lines 20 --nostream : 로그 확인
- pm2 프로세스: id1=app(포트3000), id2=fantory, id3/4=bookit(포트3002)

## 🌍 다국어 지원 구조 (10개 언어)
지원: ko, en, zh, ja, th, vi, ar, ru, fr, es

언어 선택 흐름:
1. 메인메뉴에서 언어선택 클릭
2. 10개 언어 버튼 표시 (messageText: 언어_English 형식)
3. langMap으로 언어코드 저장 → session.data.lang
4. pendingMenu에 따라 분기 (예약하기/상담하기/메인)

핵심 규칙:
- const langMap은 handleMain 함수 안에 딱 한 번만 선언
- 언어 버튼 messageText 형식: 언어_English, 언어_한국어 등
- session.data.pendingMenu로 언어선택 후 분기 처리
- 한 번 언어 선택하면 이후 모든 응답이 그 언어로 나와야 함
- 이미 언어가 선택된 경우 예약하기/상담하기 누르면 바로 해당 메뉴로 이동

## 🤖 Gemini AI 언어 설정
- langSystemInstruction을 systemInstruction에 병합해야 함
- 언어 지시문을 user 메시지 앞에 붙이면 무시됨
- 반드시 systemInstruction으로 전달해야 함
- hospital.txt 프롬프트가 한국어여도 lang 지시가 우선

## 📋 카카오 챗봇 전체 흐름
처음으로 → showWelcome(lang) → getQuickReplies(lang)
  예약하기 → 언어선택 → sendBookingMenu(url, userId, lang)
    → 시술캐러셀 → Book this (messageText: 레이저토닝 예약하기 등 한국어 고정)
    → bookingKeywords 매칭 → 예약방식 선택카드(네이버/카카오) [다국어]
    → 카카오예약하기 → 캘린더(lang파라미터) → 날짜선택완료 → 이름입력 → 예약완료
  상담하기 → 언어선택 → sendConsultMenu(url, lang)
    → 피부고민 캐러셀 → Gemini 답변(해당 언어)
  가격안내 → sendPriceMenu(url, lang)
  의료진보기 → showDoctors(url, lang) [의사사진 BASE_URL+/doctor_N.jpg]
  오시는길 → 다국어 텍스트 + 지도버튼(sendCallback 4번째인자=buttons)
  진료시간 → 다국어 텍스트

## 🔧 새 함수 만들 때 필수 체크리스트
1. lang 파라미터 받기 (기본값 ko)
2. LANG_TEXTS[lang] || LANG_TEXTS.ko 로 텍스트 가져오기
3. quickReplies는 getQuickReplies(lang) 사용
4. 버튼 있으면 sendCallback(url, text, quickReplies, buttons) 4번째 인자 사용
5. 에러 catch에서도 sendCallback 호출 보장 (try/catch 감싸기)
6. 배포 전 node --check 필수

## 🔧 sendCallback 함수 구조
sendCallback(callbackUrl, text, quickReplies=null, buttons=null)
- buttons 없으면 simpleText로 표시
- buttons 있으면 basicCard로 표시 (webLink 버튼 등)

## 🔧 LANG_TEXTS 구조 (webhook.js 상단에 정의)
각 언어마다: home(홈버튼라벨), homeMsg(항상 처음으로), error(오류메시지),
calError(캘린더먼저), calRetry(날짜선택완료라벨), dateSelected(날짜확인메시지함수)

## 📅 캘린더 연동
1. webLink URL: BASE_URL/calendar.html?userId=ID&lang=LANG
2. 날짜선택 후 POST /calendar-result 로 전송
3. 완료팝업: URL의 lang 파라미터로 다국어 메시지
4. 카카오로 돌아가서 날짜선택완료 클릭
5. GET /calendar-result/:userId 로 날짜 가져와서 처리
주의: calendar.html 수정시 실제줄바꿈 vs 
 구분 필요

## 🚨 먹통/오류 원인 및 해결
- 카카오 5초 타임아웃 → useCallback:true (webhook.js 169번줄) 로 즉시응답 후 비동기처리
- 런타임 오류(변수오타 등) → catch에서 sendCallback 반드시 실행
- Gemini API 지연 → useCallback 방식으로 해결됨
- 함수 중복선언 → grep으로 확인 후 구버전 삭제

디버깅 순서:
1. pm2 logs bookit --lines 20 --nostream
2. node --check ~/bookit-backend/src/routes/webhook.js
3. pm2 restart bookit --update-env
4. grep -n 함수명 ~/bookit-backend/src/routes/webhook.js

## ⚠️ 자주 하는 실수 TOP 5
1. langMap 중복 선언 → handleMain 안에 딱 1번만
2. sendCallback 버튼 인자 혼동 → 3번째=quickReplies(message버튼), 4번째=buttons(webLink포함)
3. 함수에 lang 파라미터 빠짐 → 항상 lang 받아서 다음 함수에도 전달
4. node --check 안 함 → 배포 전 문법 검사 필수
5. BASE_URL2 같은 별도변수 → 항상 상단의 BASE_URL 사용

## 🔐 보안/깃 관리
- .env는 절대 깃에 올리면 안됨 (.gitignore 확인)
- GitHub Push Protection 걸리면 → API키가 코드에 포함된 것 → 즉시 키 재발급
- 커밋: git add -A && git commit -m 설명 && git push
- 수정 스크립트(fix_*.js)는 작업 후 rm -f fix_*.js 로 정리

## 📦 환경변수 (.env)
SERVER_IP, KAKAO_BOT_ID, GEMINI_API_KEY(절대비공개),
KAKAO_CHANNEL_URL, NAVER_BOOKING_URL,
TELEGRAM_BOT_TOKEN, TELEGRAM_CHAT_ID

## 🏪 부킷 채널 (donworry-backend)
- 서버: ~/donworry-backend
- 포트: 3003
- PM2: donworry (id 5)
- 카카오 봇 ID: 6a2fff780cf42aa0fbefd276
- 스킬 URL: http://158.180.83.78:3003/webhook
- 기능: 20개 업종 + 다국어 10개 언어
- 관리: pm2 restart donworry --update-env

## 📋 부킷메드 업데이트 이력 (2026.06)

### 예약 플로우 개선
- showBookingType: Gemini 트리거 시 텍스트 대신 네이버/카카오 선택 카드로 변경
- 네이버 예약 선택 시: 성함/연락처 묻지 않고 바로 네이버 링크로 이동
- 카카오 예약 선택 시: 캘린더 연동
- 예약 단계에서 날짜/시간 직접 묻지 않음 (SHOW_BOOKING_TYPE 사용)

### Gemini 프롬프트 개선
- SHOW_DOCTORS: 고객이 명시적 요청 시만 표시 (자동 표시 금지)
- SHOW_BOOKING_TYPE: 시술 확인 후 즉시 표시
- 이전 대화에서 시술 정해진 경우 다시 묻지 않음
- 네이버 예약 선택 후 성함/연락처/문자안내 금지
- "예약 도와드릴까요?" 표현만 사용 (모호한 표현 금지)

### 시술 메뉴 확장
- 기존 5개 → 10개 시술로 확장
- 추가: 필러, 리프팅(울쎄라·써마지·슈링크), 제모, 스킨부스터/물광주사, 여드름흉터
- 10개 언어 전체 적용

### 프롬프트 지식베이스 확장
- 시술 상세 가이드 추가 (레이저/리프팅/보톡스/필러/스킨부스터)
- FAQ 추가 (기초/레이저/보톡스/필러/리프팅/여드름/부작용)
- 시술 카테고리별 FAQ 추가 (리프팅클리닉/눈성형/제모/필러/동안뽀디/피부)
- 피부타입별·나이대별 추천 시술 추가
- hospital.txt 총 233줄

### 주의사항
- sendBookingMenu 시술 추가 시 10개 언어 모두 수정 필요
- bookingKeywords 배열에도 새 시술 키워드 추가 필요
- 새 시술 messageText 형식: "시술명 예약하기" (한국어 고정)

## 📁 프롬프트 라이브러리 (~/prompts-library/)
- _template.txt → 모든 업종 공통 뼈대
- hospital/dermatology.txt → 피부과 ✅ 완성
- lawyer/ → 변호사 (예정)
- hair_salon/ → 미용실 (예정)
- nail/ → 네일샵 (예정)
- massage/ → 마사지 (예정)
- beauty/ → 뷰티 (예정)

## 🆕 새 고객 세팅 순서 (5단계)
1. prompts-library에서 업종 프롬프트 복사
   cp ~/prompts-library/_template.txt ~/prompts-library/[업종]/[상호].txt
2. 고객 정보 교체 (상호명, 가격, 주소, 전화번호, 운영시간)
3. .env 파일 세팅 (포트, 카카오봇ID, GEMINI_API_KEY)
4. webhook.js 업종별 템플릿 복사 후 포트/봇ID 수정
5. node --check → pm2 start → 카카오 스킬 등록

## 🔑 SSH 접속
- 사무실: ssh -i "F:\병원동행\ssh-key-2026-06-09.key" ubuntu@158.180.83.78
- 집: ssh -i "D:\병원동행\ssh-key-2026-06-09.key" ubuntu@158.180.83.78

## 💰 요금제
- 라이트 (소상공인): 월 29,800원
- 스탠다드 (외국인 소상공인): 월 99,000원
- 병원 베이직 (국내 전용): 월 149,000원
- 병원 프리미엄 (외국인 병원): 월 390,000원
