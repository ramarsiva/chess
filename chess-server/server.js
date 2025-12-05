const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const cors = require('cors');
const { v4: uuidv4 } = require('uuid');
const { Chess } = require('chess.js');

const app = express();
const server = http.createServer(app);
const io = new Server(server, { cors: { origin: '*' } });

app.use(cors({ origin: 'http://localhost:4200', methods: ['GET','POST'], allowedHeaders: ['Content-Type'] }));

let games = {};

io.on('connection', (socket) => {
  console.log('Player Connected:', socket.id);

  socket.on('createGame', (playerName, callback) => {
    const gameId = uuidv4();
    games[gameId] = {
      game: new Chess(),
      turn: 'w',
      playerNames: { [socket.id]: playerName },
      pplayers: { white: playerName, black: null },
      chat: [],
      gameHistory: [],
      currentMove: ''
    };
    socket.join(gameId);
    socket.emit('playersUpdate', games[gameId].pplayers);
    callback({ gameId });
  });

  socket.on('joinGame', ({ gameId, playerName }, callback) => {
    const game = games[gameId];
    if (game && !game.pplayers.black) {
      game.pplayers.black = { playerName };
      game.playerNames[socket.id] = playerName;
      socket.join(gameId);
      io.in(gameId).emit('playersUpdate', game.pplayers);
      callback({ success: true });
      console.log(`${playerName} joined game ${gameId}`);
    } else if (!game.pplayers.white) {
    game.pplayers.white = { playerName }; // fallback
    } else {
      callback({ success: false, message: 'Game not found or full.' });
    }
  });

  socket.on('move', ({ gameId, move }) => {
    const game = games[gameId];
    if (!game) return;
    const result = game.game.move(move);
    if (!result) return;
    game.currentMove = move;
    game.gameHistory.push(move);
    game.turn = game.turn === 'w' ? 'b' : 'w';
    io.to(gameId).emit('turnChange', game.turn);
    io.to(gameId).emit('opponentMove', move);
  });

  socket.on('chatMessage', ({ gameId, message }) => {
    const game = games[gameId];
    if (game) {
      game.chat.push({ player: game.playerNames[socket.id], message });
      io.to(gameId).emit('chatMessage', { player: game.playerNames[socket.id], message });
    }
  });

  socket.on('undoMove', ({ gameId }) => {
    const game = games[gameId];
    if (game) {
      const success = game.game.undo();
      if (success) io.to(gameId).emit('undoMove', { fen: game.game.fen(), turn: game.game.turn() });
    }
  });

  socket.on('restartGame', ({ gameId, fen, turn }) => {
    const game = games[gameId];
    if (game) {
      game.game.load(fen);
      game.turn = turn;
      io.to(gameId).emit('restartGame', { gameState: fen, turn });
    }
  });

  socket.on('getAvailableGames', (callback) => {
    const available = Object.keys(games).filter(g => !games[g].pplayers.black);
    callback(available);
  });

  socket.on('disconnect', () => {
    for (const gameId in games) {
      const game = games[gameId];
      if (game.pplayers.white === socket.id || game.pplayers.black === socket.id) {
        socket.to(gameId).emit('playerDisconnected');
        delete games[gameId];
        break;
      }
    }
  });

  socket.on('getAvailableGames', (callback) => {
    const available = Object.keys(games).filter(g => !games[g].pplayers.black);
   callback(available);
  });

});



server.listen(3000, () => {
  console.log('Server running on http://localhost:3000');
});
