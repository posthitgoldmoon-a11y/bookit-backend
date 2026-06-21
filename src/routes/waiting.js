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
    // 시연용 더미 대기자 6명
    return {
      version: '2.0',
      template: {
        outputs: [
          { simpleText: { text: '📋 현재 대기 현황\n─────────────────\n총 6팀 대기 중' } },
          { carousel: {
            type: 'basicCard',
            items: [
              {
                title: '1번 ⏳ 대기중',
                description: '👥 2인 | 📱 010-****-1234\n🏪 현장대기',
                buttons: [
                  { action: 'message', label: '🔔 입장 호출', messageText: 'admin:호출:demo1' },
                  { action: 'message', label: '📋 상세보기', messageText: 'admin:상세:demo1' }
                ]
              },
              {
                title: '2번 ⏳ 대기중',
                description: '👥 4인 | 📱 010-****-5678\n📱 원격대기',
                buttons: [
                  { action: 'message', label: '🔔 입장 호출', messageText: 'admin:호출:demo2' },
                  { action: 'message', label: '📋 상세보기', messageText: 'admin:상세:demo2' }
                ]
              },
              {
                title: '3번 ⏳ 대기중',
                description: '👥 1인 | 📱 010-****-9012\n🏪 현장대기',
                buttons: [
                  { action: 'message', label: '🔔 입장 호출', messageText: 'admin:호출:demo3' },
                  { action: 'message', label: '📋 상세보기', messageText: 'admin:상세:demo3' }
                ]
              },
              {
                title: '4번 🔔 호출됨',
                description: '👥 3인 | 📱 010-****-3456\n📱 원격대기',
                buttons: [
                  { action: 'message', label: '✅ 입장 완료', messageText: 'admin:입장:demo4' },
                  { action: 'message', label: '📋 상세보기', messageText: 'admin:상세:demo4' }
                ]
              },
              {
                title: '5번 ⏳ 대기중',
                description: '👥 2인 | 📱 010-****-7890\n🏪 현장대기',
                buttons: [
                  { action: 'message', label: '🔔 입장 호출', messageText: 'admin:호출:demo5' },
                  { action: 'message', label: '📋 상세보기', messageText: 'admin:상세:demo5' }
                ]
              },
              {
                title: '6번 ⏳ 대기중',
                description: '👥 1인 | 📱 010-****-2345\n📱 원격대기',
                buttons: [
                  { action: 'message', label: '🔔 입장 호출', messageText: 'admin:호출:demo6' },
                  { action: 'message', label: '📋 상세보기', messageText: 'admin:상세:demo6' }
                ]
              }
            ]
          }}
        ],
        quickReplies: [
          { label: '🔔 다음 손님 호출', action: 'message', messageText: 'admin:호출' },
          { label: '🔄 새로고침', action: 'message', messageText: 'admin:현황' },
          { label: '📅 예약 현황', action: 'message', messageText: 'admin:예약' },
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

  const items = activeQueue.map(e => {
    const buttons = [
      { action: 'message', label: '📋 상세보기', messageText: `admin:상세:${e.id}` }
    ];
    if (e.status === 'waiting') {
      buttons.unshift({ action: 'message', label: '🔔 다음 고객 호출', messageText: `admin:호출:${e.id}` });
    }
    if (e.status === 'called' || e.status === 'arriving') {
      buttons.unshift({ action: 'message', label: '✅ 입장 완료', messageText: `admin:입장:${e.id}` });
    }
    return {
      title: `${e.id}번 ${statusEmoji[e.status] || e.status}`,
      description: `👥 ${e.people}인 | 📱 ${e.phoneMasked}\n${e.type === 'remote' ? '📱 원격대기' : '🏪 현장대기'}`,
      buttons
    };
  });

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
async function handleWaiting(userId, utterance, callbackUrl, lang = 'ko') {
  const t = {
    ko: {
      already: '이미 대기 중입니다 😊',
      reg_title: '⏳ 웨이팅 등록',
      reg_select: '대기 등록 방식을 선택해주세요 😊',
      onsite: '🏪 현장 대기',
      remote: '📱 원격 대기',
      people_q: '몇 분이서 오셨나요? 인원을 선택해주세요 😊',
      phone_q: '📱 전화번호를 입력해주세요\n(예: 01012345678)',
      phone_invalid: '올바른 전화번호 형식이 아닙니다.\n01012345678 형식으로 입력해주세요.',
      reg_done: (p, tt) => `✅ 웨이팅 등록 완료!\n\n🎫 ${p}번째 대기 중입니다\n전체 ${tt}팀 대기 중 😊\n\n입장 순서가 되면 알림을 보내드릴게요!`,
      pos: (p, tt) => `🎫 현재 ${p}번째 대기 중입니다\n전체 ${tt}팀 대기 중 😊`,
      cancel_ok: '대기를 취소했습니다. 다음에 또 방문해주세요 😊',
      arriving: '곧 도착하신다니 감사합니다! 매장으로 와주세요 🏪',
      btn_check: '🔄 순번 확인', btn_cancel: '❌ 취소할게요', btn_home: '🏠 처음으로', btn_arrive: '🏃 곧 도착이요', btn_again: '⏳ 다시 등록'
    },
    en: {
      already: 'You are already in the waiting list 😊',
      reg_title: '⏳ Waiting Registration',
      reg_select: 'Please select your waiting type 😊',
      onsite: '🏪 On-site',
      remote: '📱 Remote',
      people_q: 'How many people? Please select 😊',
      phone_q: '📱 Please enter your phone number\n(e.g. 01012345678)',
      phone_invalid: 'Invalid phone number.\nPlease enter in 01012345678 format.',
      reg_done: (p, tt) => `✅ Registration Complete!\n\n🎫 You are #${p} in line\n${tt} team(s) waiting 😊\n\nWe will notify you when it is your turn!`,
      pos: (p, tt) => `🎫 You are currently #${p} in line\n${tt} team(s) waiting 😊`,
      cancel_ok: 'Cancelled. Hope to see you again 😊',
      arriving: 'Thank you! Please come to the clinic 🏪',
      btn_check: '🔄 Check Position', btn_cancel: '❌ Cancel', btn_home: '🏠 Home', btn_arrive: '🏃 On my way!', btn_again: '⏳ Register Again'
    },
    zh: {
      already: '您已在等待列表中 😊',
      reg_title: '⏳ 等候登记',
      reg_select: '请选择等候方式 😊',
      onsite: '🏪 现场等候',
      remote: '📱 远程等候',
      people_q: '请选择人数 😊',
      phone_q: '📱 请输入您的手机号码\n(例: 01012345678)',
      phone_invalid: '手机号码格式不正确。\n请按01012345678格式输入。',
      reg_done: (p, tt) => `✅ 登记成功！\n\n🎫 您排在第${p}位\n共${tt}组等候中 😊\n\n轮到您时我们会通知您！`,
      pos: (p, tt) => `🎫 您目前排在第${p}位\n共${tt}组等候中 😊`,
      cancel_ok: '已取消。期待您下次光临 😊',
      arriving: '感谢！请到诊所来 🏪',
      btn_check: '🔄 查看排位', btn_cancel: '❌ 取消', btn_home: '🏠 首页', btn_arrive: '🏃 马上到！', btn_again: '⏳ 重新登记'
    },
    ja: {
      already: 'すでに順番待ちリストに登録されています 😊',
      reg_title: '⏳ ウェイティング登録',
      reg_select: '待ち方を選択してください 😊',
      onsite: '🏪 店頭待ち',
      remote: '📱 リモート待ち',
      people_q: '何名様ですか？人数を選択してください 😊',
      phone_q: '📱 電話番号を入力してください\n(例: 01012345678)',
      phone_invalid: '正しい電話番号の形式ではありません。\n01012345678の形式で入力してください。',
      reg_done: (p, tt) => `✅ 登録完了！\n\n🎫 現在${p}番目です\n全${tt}組待ち中 😊\n\n順番が来たらお知らせします！`,
      pos: (p, tt) => `🎫 現在${p}番目です\n全${tt}組待ち中 😊`,
      cancel_ok: 'キャンセルしました。またのご来店をお待ちしております 😊',
      arriving: 'ありがとうございます！クリニックにお越しください 🏪',
      btn_check: '🔄 順番確認', btn_cancel: '❌ キャンセル', btn_home: '🏠 ホーム', btn_arrive: '🏃 もうすぐ到着！', btn_again: '⏳ 再登録'
    },
    th: {
      already: 'คุณอยู่ในรายการรอแล้ว 😊',
      reg_title: '⏳ ลงทะเบียนรอคิว',
      reg_select: 'กรุณาเลือกประเภทการรอ 😊',
      onsite: '🏪 รอที่หน้าร้าน',
      remote: '📱 รอทางออนไลน์',
      people_q: 'กรุณาเลือกจำนวนคน 😊',
      phone_q: '📱 กรุณากรอกหมายเลขโทรศัพท์\n(เช่น 01012345678)',
      phone_invalid: 'รูปแบบหมายเลขโทรศัพท์ไม่ถูกต้อง\nกรุณากรอกในรูปแบบ 01012345678',
      reg_done: (p, tt) => `✅ ลงทะเบียนสำเร็จ!\n\n🎫 คุณอยู่ลำดับที่ ${p}\nรอทั้งหมด ${tt} กลุ่ม 😊`,
      pos: (p, tt) => `🎫 คุณอยู่ลำดับที่ ${p}\nรอทั้งหมด ${tt} กลุ่ม 😊`,
      cancel_ok: 'ยกเลิกแล้ว หวังว่าจะพบกันใหม่ 😊',
      arriving: 'ขอบคุณ! กรุณามาที่คลินิก 🏪',
      btn_check: '🔄 ตรวจสอบคิว', btn_cancel: '❌ ยกเลิก', btn_home: '🏠 หน้าหลัก', btn_arrive: '🏃 กำลังมา!', btn_again: '⏳ ลงทะเบียนใหม่'
    },
    vi: {
      already: 'Bạn đã có trong danh sách chờ 😊',
      reg_title: '⏳ Đăng ký chờ',
      reg_select: 'Vui lòng chọn hình thức chờ 😊',
      onsite: '🏪 Chờ tại chỗ',
      remote: '📱 Chờ từ xa',
      people_q: 'Vui lòng chọn số người 😊',
      phone_q: '📱 Vui lòng nhập số điện thoại\n(ví dụ: 01012345678)',
      phone_invalid: 'Số điện thoại không hợp lệ.\nVui lòng nhập theo định dạng 01012345678.',
      reg_done: (p, tt) => `✅ Đăng ký thành công!\n\n🎫 Bạn đang ở vị trí số ${p}\n${tt} nhóm đang chờ 😊`,
      pos: (p, tt) => `🎫 Bạn đang ở vị trí số ${p}\n${tt} nhóm đang chờ 😊`,
      cancel_ok: 'Đã hủy. Hẹn gặp lại 😊',
      arriving: 'Cảm ơn! Vui lòng đến phòng khám 🏪',
      btn_check: '🔄 Kiểm tra vị trí', btn_cancel: '❌ Hủy', btn_home: '🏠 Trang chủ', btn_arrive: '🏃 Sắp đến!', btn_again: '⏳ Đăng ký lại'
    },
    ar: {
      already: 'أنت بالفعل في قائمة الانتظار 😊',
      reg_title: '⏳ تسجيل الانتظار',
      reg_select: 'الرجاء اختيار نوع الانتظار 😊',
      onsite: '🏪 انتظار في المكان',
      remote: '📱 انتظار عن بُعد',
      people_q: 'الرجاء اختيار عدد الأشخاص 😊',
      phone_q: '📱 الرجاء إدخال رقم هاتفك\n(مثال: 01012345678)',
      phone_invalid: 'رقم الهاتف غير صحيح.\nالرجاء الإدخال بصيغة 01012345678.',
      reg_done: (p, tt) => `✅ تم التسجيل بنجاح!\n\n🎫 أنت في المركز ${p}\n${tt} مجموعة في الانتظار 😊`,
      pos: (p, tt) => `🎫 أنت حالياً في المركز ${p}\n${tt} مجموعة في الانتظار 😊`,
      cancel_ok: 'تم الإلغاء. نأمل رؤيتك مرة أخرى 😊',
      arriving: 'شكراً! يرجى المجيء إلى العيادة 🏪',
      btn_check: '🔄 تحقق من الموقع', btn_cancel: '❌ إلغاء', btn_home: '🏠 الرئيسية', btn_arrive: '🏃 في الطريق!', btn_again: '⏳ التسجيل مجدداً'
    },
    ru: {
      already: 'Вы уже в списке ожидания 😊',
      reg_title: '⏳ Регистрация в очередь',
      reg_select: 'Пожалуйста, выберите тип ожидания 😊',
      onsite: '🏪 Ожидание на месте',
      remote: '📱 Удалённое ожидание',
      people_q: 'Пожалуйста, выберите количество человек 😊',
      phone_q: '📱 Введите номер телефона\n(например: 01012345678)',
      phone_invalid: 'Неверный формат номера телефона.\nВведите в формате 01012345678.',
      reg_done: (p, tt) => `✅ Регистрация завершена!\n\n🎫 Вы ${p}-й в очереди\n${tt} групп ожидают 😊`,
      pos: (p, tt) => `🎫 Вы сейчас ${p}-й в очереди\n${tt} групп ожидают 😊`,
      cancel_ok: 'Отменено. Надеемся увидеть вас снова 😊',
      arriving: 'Спасибо! Пожалуйста, приходите в клинику 🏪',
      btn_check: '🔄 Проверить позицию', btn_cancel: '❌ Отмена', btn_home: '🏠 Главная', btn_arrive: '🏃 Уже иду!', btn_again: '⏳ Зарегистрироваться снова'
    },
    fr: {
      already: "Vous êtes déjà sur la liste d'attente 😊",
      reg_title: '⏳ Inscription en attente',
      reg_select: "Veuillez sélectionner votre type d'attente 😊",
      onsite: '🏪 Sur place',
      remote: '📱 À distance',
      people_q: 'Veuillez sélectionner le nombre de personnes 😊',
      phone_q: '📱 Veuillez entrer votre numéro de téléphone\n(ex: 01012345678)',
      phone_invalid: 'Numéro de téléphone invalide.\nVeuillez entrer au format 01012345678.',
      reg_done: (p, tt) => `✅ Inscription réussie!\n\n🎫 Vous êtes le numéro ${p}\n${tt} groupe(s) en attente 😊`,
      pos: (p, tt) => `🎫 Vous êtes actuellement numéro ${p}\n${tt} groupe(s) en attente 😊`,
      cancel_ok: 'Annulé. À bientôt 😊',
      arriving: 'Merci! Veuillez venir à la clinique 🏪',
      btn_check: '🔄 Vérifier position', btn_cancel: '❌ Annuler', btn_home: '🏠 Accueil', btn_arrive: "🏃 J'arrive!", btn_again: "⏳ S'inscrire à nouveau"
    },
    es: {
      already: 'Ya estás en la lista de espera 😊',
      reg_title: '⏳ Registro en espera',
      reg_select: 'Por favor selecciona el tipo de espera 😊',
      onsite: '🏪 En el lugar',
      remote: '📱 De forma remota',
      people_q: 'Por favor selecciona el número de personas 😊',
      phone_q: '📱 Por favor ingresa tu número de teléfono\n(ej: 01012345678)',
      phone_invalid: 'Número de teléfono inválido.\nIngresa en formato 01012345678.',
      reg_done: (p, tt) => `✅ ¡Registro completo!\n\n🎫 Estás en el puesto #${p}\n${tt} grupo(s) esperando 😊`,
      pos: (p, tt) => `🎫 Actualmente estás en el puesto #${p}\n${tt} grupo(s) esperando 😊`,
      cancel_ok: 'Cancelado. ¡Esperamos verte pronto! 😊',
      arriving: '¡Gracias! Por favor ven a la clínica 🏪',
      btn_check: '🔄 Ver posición', btn_cancel: '❌ Cancelar', btn_home: '🏠 Inicio', btn_arrive: '🏃 ¡Ya voy!', btn_again: '⏳ Registrarse de nuevo'
    }
  };
  const T = t[lang] || t.ko;
  const ws = getWaitingSession(userId);

  // 순번 확인
  if (utterance === '웨이팅:순번확인') {
    const entry = waiting.getByUserId(userId);
    if (!entry) {
      return {
        version: '2.0',
        template: {
          outputs: [{ simpleText: { text: T.already } }],
          quickReplies: [
            { label: T.btn_again, action: 'message', messageText: '웨이팅등록' },
            { label: T.btn_home, action: 'message', messageText: '처음으로' }
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
          outputs: [{ simpleText: { text: `🔔 ${T.arriving}` } }],
          quickReplies: [
            { label: T.btn_arrive, action: 'message', messageText: '웨이팅:도착' },
            { label: T.btn_cancel, action: 'message', messageText: '웨이팅:취소' }
          ]
        }
      };
    }

    // 취소 상태
    if (entry.status === 'cancelled') {
      return {
        version: '2.0',
        template: {
          outputs: [{ simpleText: { text: T.cancel_ok } }],
          quickReplies: [
            { label: T.btn_again, action: 'message', messageText: '웨이팅등록' }
          ]
        }
      };
    }

    return {
      version: '2.0',
      template: {
        outputs: [{ simpleText: { text: T.pos(pos.position, pos.total) } }],
        quickReplies: [
          { label: T.btn_check, action: 'message', messageText: '웨이팅:순번확인' },
          { label: T.btn_cancel, action: 'message', messageText: '웨이팅:취소' },
          { label: T.btn_home, action: 'message', messageText: '처음으로' }
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
        outputs: [{ simpleText: { text: T.arriving } }],
        quickReplies: [
          { label: T.btn_check, action: 'message', messageText: '웨이팅:순번확인' }
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
        outputs: [{ simpleText: { text: T.cancel_ok } }],
        quickReplies: [
          { label: T.btn_home, action: 'message', messageText: '처음으로' }
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
          outputs: [{ simpleText: { text: T.pos(pos?.position || '?', pos?.total || '?') } }],
          quickReplies: [
            { label: T.btn_check, action: 'message', messageText: '웨이팅:순번확인' },
            { label: T.btn_cancel, action: 'message', messageText: '웨이팅:취소' }
          ]
        }
      };
    }
    return {
      version: '2.0',
      template: {
        outputs: [{ simpleText: { text: `${T.reg_title}\n─────────────────\n${T.reg_select}` } }],
        quickReplies: [
          { label: T.onsite, action: 'message', messageText: '웨이팅:현장' },
          { label: T.remote, action: 'message', messageText: '웨이팅:원격' }
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
          outputs: [{ simpleText: { text: T.pos(pos?.position || '?', pos?.total || '?') } }],
          quickReplies: [
            { label: T.btn_check, action: 'message', messageText: '웨이팅:순번확인' },
            { label: T.btn_cancel, action: 'message', messageText: '웨이팅:취소' }
          ]
        }
      };
    }
    ws.step = 'people';
    ws.type = (utterance === '웨이팅:원격' || utterance === '원격웨이팅') ? 'remote' : 'onsite';
    const typeLabel = ws.type === 'remote' ? T.remote : T.onsite;
    return {
      version: '2.0',
      template: {
        outputs: [{ simpleText: { text: `${typeLabel}\n\n${T.people_q}` } }],
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
        outputs: [{ simpleText: { text: `${ws.people} ${T.phone_q}` } }]
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
        outputs: [{ simpleText: { text: T.reg_done(pos.position, pos.total) } }],
        quickReplies: [
          { label: T.btn_check, action: 'message', messageText: '웨이팅:순번확인' },
          { label: T.btn_cancel, action: 'message', messageText: '웨이팅:취소' },
          { label: T.btn_home, action: 'message', messageText: '처음으로' }
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
    const realCount = waiting.getWaitingCount();
    const waitingCount = realCount > 0 ? realCount : 6;
    return {
      version: '2.0',
      template: {
        outputs: [{ simpleText: { text: `🔐 관리자 모드입니다 😊\n${BIZ_NAME} 관리자 대시보드\n─────────────────\n현재 대기 ${waitingCount}팀` } }],
        quickReplies: [
          { label: '⏳ 대기자 관리', action: 'message', messageText: 'admin:현황' },
          { label: '📅 예약 현황', action: 'message', messageText: 'admin:예약' },
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

  // 시연용 더미 호출/상세/입장 처리
  if (utterance.startsWith('admin:호출:demo') || utterance.startsWith('admin:상세:demo') || utterance.startsWith('admin:입장:demo')) {
    const num = utterance.split(':').pop().replace('demo','');
    const demoData = {
      '1': { people: '2인', phone: '010-2234-1234', type: '현장대기' },
      '2': { people: '4인', phone: '010-3345-5678', type: '원격대기' },
      '3': { people: '1인', phone: '010-4456-9012', type: '현장대기' },
      '4': { people: '3인', phone: '010-5567-3456', type: '원격대기' },
      '5': { people: '2인', phone: '010-6678-7890', type: '현장대기' },
      '6': { people: '1인', phone: '010-7789-2345', type: '원격대기' }
    };
    const d = demoData[num] || { people: '2인', phone: '010-0000-0000', type: '현장대기' };

    if (utterance.startsWith('admin:호출:demo')) {
      return {
        version: '2.0',
        template: {
          outputs: [{ simpleText: { text: `🔔 ${num}번 손님(${d.phone}) 호출 완료!\n\n📱 실제 서비스에서는 이 순간\n손님 카카오톡으로 입장 알림이\n자동 발송됩니다! 😊` } }],
          quickReplies: [
            { label: '🔄 대기 현황', action: 'message', messageText: 'admin:현황' },
            { label: '📅 예약 현황', action: 'message', messageText: 'admin:예약' },
            { label: '🚪 관리자 종료', action: 'message', messageText: 'admin:종료' }
          ]
        }
      };
    }
    if (utterance.startsWith('admin:상세:demo')) {
      return {
        version: '2.0',
        template: {
          outputs: [{ simpleText: { text: `📋 ${num}번 상세 정보\n─────────────────\n👥 인원: ${d.people}\n📱 연락처: ${d.phone}\n🏷️ 대기유형: ${d.type}\n⏳ 상태: 대기중` } }],
          quickReplies: [
            { label: '🔔 입장 호출', action: 'message', messageText: `admin:호출:demo${num}` },
            { label: '◀ 대기 현황', action: 'message', messageText: 'admin:현황' },
            { label: '🚪 관리자 종료', action: 'message', messageText: 'admin:종료' }
          ]
        }
      };
    }
    if (utterance.startsWith('admin:입장:demo')) {
      return {
        version: '2.0',
        template: {
          outputs: [{ simpleText: { text: `✅ ${num}번 손님 입장 완료!\n즐거운 진료 되세요 😊` } }],
          quickReplies: [
            { label: '🔔 다음 손님 호출', action: 'message', messageText: 'admin:호출' },
            { label: '🔄 대기 현황', action: 'message', messageText: 'admin:현황' },
            { label: '🚪 관리자 종료', action: 'message', messageText: 'admin:종료' }
          ]
        }
      };
    }
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

  // 예약 현황 (시연용 더미 데이터 - 피부과)
  if (utterance === 'admin:예약') {
    return {
      version: '2.0',
      template: {
        outputs: [
          { simpleText: { text: '📅 예약 현황\n─────────────────\n날짜를 선택하시면 상세 내역을 확인할 수 있습니다 😊' } },
          { carousel: {
            type: 'basicCard',
            items: [
              {
                title: '📆 오늘 · 6월 21일 (토)',
                description: '총 5건 예약',
                buttons: [{ action: 'message', label: '📋 상세보기', messageText: 'admin:예약:오늘' }]
              },
              {
                title: '📆 내일 · 6월 22일 (일)',
                description: '총 3건 예약',
                buttons: [{ action: 'message', label: '📋 상세보기', messageText: 'admin:예약:내일' }]
              },
              {
                title: '📆 6월 23일 (월)',
                description: '총 7건 예약',
                buttons: [{ action: 'message', label: '📋 상세보기', messageText: 'admin:예약:모레' }]
              }
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

  // 예약 상세 - 오늘
  if (utterance === 'admin:예약:오늘') {
    return {
      version: '2.0',
      template: {
        outputs: [
          { simpleText: { text: '📆 6월 21일 (토) 예약 상세\n─────────────────\n총 5건' } },
          { carousel: {
            type: 'basicCard',
            items: [
              {
                title: '10:00 김미영 ✅ 예약확정',
                description: '💉 레이저 토닝 1회\n📱 010-2345-1234\n📌 카카오채널 예약\n💬 양 볼과 광대 부위 기미가 오래되어 개선 원함. 자외선 차단제 미사용 습관 있어 생활습관 안내 필요. 첫 방문.'
              },
              {
                title: '11:00 이준호 ✅ 예약확정',
                description: '✨ 보톡스 (이마)\n📱 010-3456-5678\n📌 네이버 예약\n💬 이마 가로 주름이 표정 쓸 때 심하게 잡힌다고 함. 자연스러운 결과 원하며 과도한 시술 원치 않음. 3개월 전 타원 시술 경험 있음.'
              },
              {
                title: '13:00 박서연 ✅ 예약확정',
                description: '💋 필러 (볼 볼륨)\n📱 010-4567-9012\n📌 카카오채널 예약\n💬 다이어트 후 볼이 꺼져 피곤해 보인다는 말 자주 들음. 자연스러운 볼륨 원하며 과도한 필러는 원치 않는다고 명시. 첫 방문.'
              },
              {
                title: '15:00 최동훈 ✅ 예약확정',
                description: '🔬 피부 상담\n📱 010-5678-3456\n📌 네이버 예약\n💬 고등학교 때부터 반복된 여드름으로 볼·턱 부위 흉터 다수. 이전에 압출 위주로 관리해 흉터 심화된 상태. 치료 방법 및 비용 전반 상담 희망.'
              },
              {
                title: '17:00 정하은 ✅ 예약확정',
                description: '💉 여드름 치료\n📱 010-6789-7890\n📌 카카오채널 예약\n💬 코 주변 및 턱 라인에 염증성 여드름 반복 발생. 생리 전후로 심해지는 패턴. 3개월 전 타원 치료 후 일시 호전됐으나 재발. 장기 관리 플랜 원함.'
              }
            ]
          }}
        ],
        quickReplies: [
          { label: '◀ 예약 현황', action: 'message', messageText: 'admin:예약' },
          { label: '◀ 대시보드', action: 'message', messageText: ADMIN_PASSWORD }
        ]
      }
    };
  }

  // 예약 상세 - 내일
  if (utterance === 'admin:예약:내일') {
    return {
      version: '2.0',
      template: {
        outputs: [
          { simpleText: { text: '📆 6월 22일 (일) 예약 상세\n─────────────────\n총 3건' } },
          { carousel: {
            type: 'basicCard',
            items: [
              {
                title: '10:30 한지수 ✅ 예약확정',
                description: '✨ 리프팅 (울쎄라)\n📱 010-7890-2345\n📌 카카오채널 예약\n💬 출산 후 턱선 및 볼 처짐이 심해졌다고 함. 수술 없이 리프팅 효과 원하며 울쎄라 문의. 지인 소개로 내원 예정. 첫 방문.'
              },
              {
                title: '14:00 윤재원 ✅ 예약확정',
                description: '💉 색소 레이저\n📱 010-8901-6789\n📌 네이버 예약\n💬 햇볕 노출 많은 직업으로 양 볼·코 잡티 다수. 지난달 1회 시술 후 일부 개선. 이번 2회차 시술 후 효과 평가 및 추가 횟수 상담 희망.'
              },
              {
                title: '16:00 강나래 ⏳ 대기중',
                description: '🔬 피부 상담\n📱 010-9012-0123\n📌 카카오채널 예약\n💬 최근 환절기 이후 볼 부위 홍조 및 뾰루지 반복. 기존 사용 화장품에 자극 느껴 성분 민감성 가능성 있음. 피부 타입 진단 및 관리 방향 상담 원함.'
              }
            ]
          }}
        ],
        quickReplies: [
          { label: '◀ 예약 현황', action: 'message', messageText: 'admin:예약' },
          { label: '◀ 대시보드', action: 'message', messageText: ADMIN_PASSWORD }
        ]
      }
    };
  }

  // 예약 상세 - 모레
  if (utterance === 'admin:예약:모레') {
    return {
      version: '2.0',
      template: {
        outputs: [
          { simpleText: { text: '📆 6월 23일 (월) 예약 상세\n─────────────────\n총 7건' } },
          { carousel: {
            type: 'basicCard',
            items: [
              {
                title: '09:30 오민준 ✅ 예약확정',
                description: '💉 레이저 토닝 5회권\n📱 010-1234-1111\n📌 네이버 예약\n💬 2개월 전 1회권으로 효과 확인 후 5회권 결제 희망. 광대·이마 기미 집중 케어 원함. 이번 3회차. 직전 시술 후 약간의 발적 있었으나 3일 내 소실됨.'
              },
              {
                title: '10:30 서지현 ✅ 예약확정',
                description: '✨ 보톡스 (사각턱)\n📱 010-2345-2222\n📌 카카오채널 예약\n💬 사각턱이 두드러져 얼굴이 커 보인다는 고민. 자연스럽게 갸름해지는 효과 원하며 과도한 변화는 원치 않음. 타원 경험 없는 첫 방문.'
              },
              {
                title: '11:30 문성민 ✅ 예약확정',
                description: '💋 필러 (입술)\n📱 010-3456-3333\n📌 카카오채널 예약\n💬 윗입술이 얇아 무표정 시 인상이 차가워 보인다고 함. 자연스러운 볼륨감 원하며 과도한 시술 원치 않음. 6개월 전 타원에서 동일 부위 시술 경험 있음.'
              },
              {
                title: '13:30 양희진 ✅ 예약확정',
                description: '🔬 여드름 흉터 치료\n📱 010-4567-4444\n📌 네이버 예약\n💬 양 볼 박스형 흉터 다수. 이전에 압출·스팟 치료 반복으로 흉터 심화된 상태. 프락셀·리쥬란 등 시술 옵션 비교 상담 및 치료 횟수 안내 희망.'
              },
              {
                title: '14:30 손태양 ✅ 예약확정',
                description: '✨ 리프팅 (써마지)\n📱 010-5678-5555\n📌 카카오채널 예약\n💬 눈가·목 주름 및 전반적인 피부 탄력 저하 고민. 울쎄라와 써마지 차이 문의 후 써마지 선택. 시술 후 일상복귀 빠른 방법 선호.'
              },
              {
                title: '15:30 백도현 ⏳ 대기중',
                description: '💉 제모 레이저\n📱 010-6789-6666\n📌 카카오채널 예약\n💬 겨드랑이·팔·다리 전체 제모 희망. 이전 왁싱만 해왔으며 레이저 제모는 첫 시도. 피부 톤이 밝은 편으로 시술 적합성 확인 필요. 첫 방문.'
              },
              {
                title: '17:00 홍수아 ✅ 예약확정',
                description: '🔬 피부 상담\n📱 010-7890-7777\n📌 네이버 예약\n💬 최근 이사 후 환경 변화로 피부 트러블 급증. 이마·턱 주변 좁쌀 여드름 및 피지 과다 분비. 기존 병원 처방 연고 효과 미미. 피부 타입 재진단 및 관리 루틴 상담 원함.'
              }
            ]
          }}
        ],
        quickReplies: [
          { label: '◀ 예약 현황', action: 'message', messageText: 'admin:예약' },
          { label: '◀ 대시보드', action: 'message', messageText: ADMIN_PASSWORD }
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
