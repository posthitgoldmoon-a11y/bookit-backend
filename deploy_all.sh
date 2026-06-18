#!/bin/bash

# =============================================
# 부킷 일괄배포 스크립트
# 사용법: ./deploy_all.sh [업종]
# 예시: ./deploy_all.sh hospital
#       ./deploy_all.sh restaurant
#       ./deploy_all.sh beauty
# =============================================

INDUSTRY=${1:-hospital}

case $INDUSTRY in
  hospital)
    SOURCE=~/bookit-backend
    TARGETS=(
      # 새 병원 채널 추가할 때 여기에 추가
      # ~/bookit-hospital-2-backend
      # ~/bookit-hospital-3-backend
    )
    PM2_NAMES=(
      # hospital_2
      # hospital_3
    )
    ;;
  restaurant)
    SOURCE=~/gourmet-backend
    TARGETS=(
      # ~/bookit-gourmet-2-backend
    )
    PM2_NAMES=(
      # gourmet_2
    )
    ;;
  beauty)
    SOURCE=~/beauty-backend
    TARGETS=(
      # ~/bookit-beauty-2-backend
    )
    PM2_NAMES=(
      # beauty_2
    )
    ;;
  *)
    echo "❌ 알 수 없는 업종: $INDUSTRY"
    echo "사용법: ./deploy_all.sh [hospital|restaurant|beauty]"
    exit 1
    ;;
esac

echo "🚀 [$INDUSTRY] 일괄배포 시작..."
echo "📌 대장채널: $SOURCE"
echo ""

if [ ${#TARGETS[@]} -eq 0 ]; then
  echo "⚠️ 배포할 채널이 없어요. deploy_all.sh에 TARGETS를 추가해주세요."
  exit 0
fi

for i in "${!TARGETS[@]}"; do
  TARGET=${TARGETS[$i]}
  PM2_NAME=${PM2_NAMES[$i]}

  if [ ! -d "$TARGET" ]; then
    echo "❌ $TARGET 디렉토리 없음 - 스킵"
    continue
  fi

  echo "📂 $TARGET 배포 중..."

  # webhook.js만 복사 (업장정보, .env 제외)
  cp $SOURCE/src/routes/webhook.js $TARGET/src/routes/webhook.js

  # 문법 체크
  node --check $TARGET/src/routes/webhook.js
  if [ $? -ne 0 ]; then
    echo "❌ $TARGET 문법 오류! 배포 중단"
    exit 1
  fi

  # PM2 재시작
  pm2 restart $PM2_NAME --update-env
  echo "✅ $TARGET 완료"
  echo ""
done

echo "🎉 [$INDUSTRY] 일괄배포 완료!"
