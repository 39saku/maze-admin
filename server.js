const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const cors = require('cors');

const app = express();
app.use(cors());
app.use(express.static('public')); // 管理画面用
app.use('/data', express.static('data')); // これを追加！


const server = http.createServer(app);
const io = new Server(server, {
    cors: { origin: "*" } // どこからの接続も許可
});

let scores = {}; // ニックネームをキーに最新スコアを保持

io.on('connection', (socket) => {
    console.log('接続されました:', socket.id);

    // 接続時に現在の全スコアを送信
    socket.emit('update_leaderboard', Object.values(scores));

    // スコア受信
    socket.on('submit_score', (data) => {
        // 同じ名前・同じレベルは上書き
        scores[`${data.nickname}_${data.level}`] = {
            ...data,
            timestamp: new Date().toLocaleTimeString()
        };
        // 全員（リーダーボード）に更新を通知
        io.emit('update_leaderboard', Object.values(scores));
        // 速報テロップ用
        io.emit('new_goal_news', data);
    });

    // 運営からの指示：一括停止
    socket.on('admin_emergency_stop', () => {
        io.emit('remote_stop');
    });

    socket.on('disconnect', () => {
        console.log('切断されました');
    });

    // server.js の io.on('connection', ...) 内に追加

    // 運営からの指示：全員にマップを強制配信
    socket.on('admin_broadcast_map', (mapData) => {
        console.log('本番マップを配信します:', mapData.name);
        io.emit('remote_load_map', mapData);
    });
});

const PORT = 3000;
server.listen(PORT, () => {
    console.log(`運営サーバーが起動しました: http://localhost:${PORT}`);
});