const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const cors = require('cors');
const fs = require('fs');

const app = express();
app.use(cors());

app.use(express.static('public'));
app.use('/data', express.static('data'));

const server = http.createServer(app);
const io = new Server(server, {
    cors: { origin: "*" }
});

let scores = {};

const SCORE_FILE = './scores.json';

function saveScoresToFile() {
    try {
        fs.writeFileSync(SCORE_FILE, JSON.stringify(scores, null, 2));
    } catch (err) {
        console.error("ファイル保存エラー:", err);
    }
}

if (fs.existsSync(SCORE_FILE)) {
    try {
        const rawData = fs.readFileSync(SCORE_FILE, 'utf8');
        scores = JSON.parse(rawData);
        console.log("前回のスコアデータを読み込みました。");
    } catch (err) {
        console.error("ファイル読み込みエラー:", err);
        scores = {};
    }
}

io.on('connection', (socket) => {
    console.log('新規接続:', socket.id);

    socket.emit('update_leaderboard', Object.values(scores));

    socket.on('submit_score', (data) => {
        console.log(`スコア受信: ${data.nickname} (Level ${data.level})`);

        const key = `${data.nickname}_${data.level}`;
        scores[key] = {
            ...data,
            timestamp: new Date().toLocaleTimeString()
        };

        saveScoresToFile();

        io.emit('update_leaderboard', Object.values(scores));

        io.emit('new_goal_news', data);
    });

    socket.on('admin_emergency_stop', () => {
        console.log('【緊急】全端末に停止命令を送信しました');
        io.emit('remote_stop');
    });

    socket.on('disconnect', () => {
        console.log('切断:', socket.id);
    });
});

const PORT = 3000;
server.listen(PORT, () => {
    console.log('--------------------------------------------------');
    console.log(` 運営サーバーが正常に起動しました`);
    console.log(` 管理画面: http://localhost:${PORT}`);
    console.log(` 待機中...`);
    console.log('--------------------------------------------------');
});