const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const cors = require('cors');
const fs = require('fs'); // ファイル保存用

const app = express();
app.use(cors());

// --- 静的ファイルの公開設定 ---
// publicフォルダ（ランキング・バトル画面）を公開
app.use(express.static('public'));
// dataフォルダ（迷路データ）を公開
app.use('/data', express.static('data'));

const server = http.createServer(app);
const io = new Server(server, {
    cors: { origin: "*" }
});

// スコアを保持するオブジェクト
let scores = {};

// --- データの保存・読み込みロジック ---
const SCORE_FILE = './scores.json';

// スコアをファイルに書き出す関数
function saveScoresToFile() {
    try {
        fs.writeFileSync(SCORE_FILE, JSON.stringify(scores, null, 2));
    } catch (err) {
        console.error("ファイル保存エラー:", err);
    }
}

// 起動時にファイルがあれば読み込む
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

// --- 通信ロジック ---
io.on('connection', (socket) => {
    console.log('新規接続:', socket.id);

    // 接続した瞬間に、現在のランキングデータを送ってあげる
    socket.emit('update_leaderboard', Object.values(scores));

    // 参加者からスコアが届いたとき
    socket.on('submit_score', (data) => {
        console.log(`スコア受信: ${data.nickname} (Level ${data.level})`);

        // ニックネームとレベルをキーにして保存（同じ人が同じ問題を解いたら最新で上書き）
        const key = `${data.nickname}_${data.level}`;
        scores[key] = {
            ...data,
            timestamp: new Date().toLocaleTimeString()
        };

        // ファイルにバックアップを保存
        saveScoresToFile();

        // 全員（リーダーボード画面など）に最新の全スコアを送信
        io.emit('update_leaderboard', Object.values(scores));

        // 速報テロップ用に、今届いたデータだけを個別に送信
        io.emit('new_goal_news', data);
    });

    // 運営画面から「全停止」が押されたとき
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