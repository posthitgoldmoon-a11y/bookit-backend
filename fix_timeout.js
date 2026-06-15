const fs = require('fs');
const file = '/home/ubuntu/bookit-backend/src/routes/webhook.js';
let code = fs.readFileSync(file, 'utf8');

// 전체 오류 catch에서 콜백 응답 보장
const oldCatch = `  } catch(err) {
    console.error('❌ 전체오류:', err.message);
    console.error(err.stack);
    await sendCallback(callbackUrl, "잠시 오류가 발생했습니다. 다시 시도해주세요 😊");
  }`;

const newCatch = `  } catch(err) {
    console.error('❌ 전체오류:', err.message);
    console.error(err.stack);
    const errLang = (session && session.data && session.data.lang) ? session.data.lang : 'ko';
    const errTexts = {
      ko: '잠시 오류가 발생했습니다. 다시 시도해주세요 😊',
      en: 'An error occurred. Please try again 😊',
      zh: '发生错误，请重试 😊',
      ja: 'エラーが発生しました。もう一度お試しください 😊',
      th: 'เกิดข้อผิดพลาด กรุณาลองใหม่ 😊',
      vi: 'Đã xảy ra lỗi. Vui lòng thử lại 😊',
      ar: 'حدث خطأ. يرجى المحاولة مرة أخرى 😊',
      ru: 'Произошла ошибка. Попробуйте снова 😊',
      fr: 'Une erreur s\\'est produite. Veuillez réessayer 😊',
      es: 'Ocurrió un error. Por favor intente de nuevo 😊'
    };
    try {
      await sendCallback(callbackUrl, errTexts[errLang] || errTexts.ko);
    } catch(e2) {
      console.error('❌ 콜백 응답도 실패:', e2.message);
    }
  }`;

if (code.includes(oldCatch)) {
  code = code.replace(oldCatch, newCatch);
  fs.writeFileSync(file, code, 'utf8');
  console.log('✅ 오류 핸들러 다국어+안전 처리 완료');
} else {
  console.log('❌ 텍스트 못 찾음');
  const lines = code.split('\n');
  lines.forEach((l, i) => { if (l.includes('전체오류')) console.log(i+1, l); });
}
