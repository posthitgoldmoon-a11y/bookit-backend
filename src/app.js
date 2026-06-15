const express = require('express');
const cors = require('cors');
const path = require('path');
require('dotenv').config();

const app = express();
app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, '../public')));

const webhookRouter = require('./routes/webhook');
app.use('/webhook', webhookRouter);

// 캘린더 결과 저장
const calendarResults = {};
app.post('/calendar-result', (req, res) => {
  const { userId, datetime } = req.body;
  if (userId && datetime) {
    calendarResults[userId] = { datetime, success: true };
    res.json({ success: true });
  } else {
    res.json({ success: false });
  }
});
app.get('/calendar-result/:userId', (req, res) => {
  const result = calendarResults[req.params.userId];
  res.json(result || { success: false });
});

const PORT = process.env.PORT || 3002;
app.listen(PORT, () => {
  console.log(`🏥 Bookit 병원 챗봇 서버 실행중: http://localhost:${PORT}`);
});

module.exports = app;
