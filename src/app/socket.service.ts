import { Injectable } from '@angular/core';
import { io, Socket } from 'socket.io-client';

@Injectable({ providedIn: 'root' })
export class SocketService {
  socket: Socket;

  constructor() {
    this.socket = io('https://chess-qosd.onrender.com');
  }

  createGame(playerName: string, callback: Function) {
    this.socket.emit('createGame', { playerName }, callback);
  }

  joinGame(gameId: string, playerName: string, callback: Function) {
    this.socket.emit('joinGame', { gameId, playerName }, callback);
  }

  onPlayersUpdate(callback: (players: any) => void) {
    this.socket.on('playersUpdate', callback);
  }

  sendMove(gameId: string, move: any) {
    this.socket.emit('move', { gameId, move });
  }

  onOpponentMove(callback: (move: any) => void) {
    this.socket.on('opponentMove', callback);
  }

  sendChatMessage(gameId: string, message: any) {
    this.socket.emit('chatMessage', { gameId, message });
  }

  onChatMessage(callback: (message: any) => void) {
    this.socket.on('chatMessage', callback);
  }

  undoMove(gameId: string) {
    this.socket.emit('undoMove', { gameId });
  }

  onUndoMove(callback: (data: { fen: string; turn: string }) => void) {
    this.socket.on('undoMove', callback);
  }

  restartGame(gameId: string, fen: string, turn: string) {
    this.socket.emit('restartGame', { gameId, fen, turn });
  }

  onRestartGame(callback: (data: any) => void) {
    this.socket.on('restartGame', callback);
  }

  getAvailableGames(callback: (games: string[]) => void) {
    this.socket.emit('getAvailableGames', callback);
  }
}


