import { Component, AfterViewInit, AfterViewChecked, ChangeDetectorRef, NgZone } from '@angular/core';
import { SocketService } from './socket.service';
import { Chess } from 'chess.js';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

declare var ChessBoard: any;

@Component({
  selector: 'app-root',
  templateUrl: './app.component.html',
  styleUrls: ['./app.component.css'],
  imports: [CommonModule, FormsModule],
})
export class AppComponent implements AfterViewInit, AfterViewChecked {
  title(title: any) {
    throw new Error('Method not implemented.');
  }
  playerName = '';
  gameId = '';
  joined = false;
  playerNames: any = {};
  game: any;
  board: any;
  chatMessages: any[] = [];
  currentMessage = '';
  playerTurn: string = 'White'; // Track whose turn it is
  playerColor: 'w' | 'b' = 'w';
  players: any = {};
  _isPlayerTurn: boolean = false;  // Just use a boolean variable
  gameState: any;
  currentTurn: any;
  availableGames: string[] = []; // store available game IDs

  

  constructor(private socketService: SocketService, private cdr: ChangeDetectorRef, private ngZone: NgZone) {}

  ngAfterViewInit() {
    this.initializeBoard();
    this.getAvailableGames(); 
  }

  ngAfterViewChecked() {
    this.initializeBoard();
  }

  initializeBoard() {
    const boardElement = document.getElementById('board1');
    if (boardElement && !this.board) {
      this.startGame();
    }
  }

  createGame() {

    if (!this.playerName.trim()) {
      alert('Please enter your name before creating a game.');
      return;
    }

    this.socketService.createGame(this.playerName, (res: any) => {
      this.gameId = res.gameId;
      this.playerColor = 'w';
      this.listen();
      this.joined = true;
      this.playerTurn = 'White'; // White goes first
         // Wait for Angular to render the board in the DOM
    setTimeout(() => this.startGame(), 0);
    });
    
  }

  joinGame(gameId?: string) {

    if (!this.playerName.trim()) {
      alert('Please enter your name before joining a game.');
      return;
    }

    const idToJoin = gameId || this.gameId;
    if (!idToJoin) {
      alert('Please select or enter a game ID.');
      return;
    }
    this.listen();
    this.socketService.joinGame(idToJoin, this.playerName, (res: any) => {
      if (res.success) {
        this.gameId = idToJoin;
        this.playerColor = 'b';
        this.joined = true;
        this.playerTurn = 'Black'; // Black goes second
        setTimeout(() => this.startGame(), 0);
      } else {
        alert(res.message);
      }
    });
  }

  getAvailableGames() {
  this.socketService.getAvailableGames((games: string[]) => {
    this.ngZone.run(() => {
      this.availableGames = games;
      console.log('Available games:', this.availableGames);
    });
  });
}


  listen() {
    this.socketService.onPlayersUpdate((players) => {

      this.ngZone.run(() => {
          this.players = {
    white: players.white ? { playerName: players.white.playerName } : null,
    black: players.black ? { playerName: players.black.playerName } : null
  };
        console.log('Updated players:', this.players);
      });
      console.log('Updated players:', players);
      console.log('Black player name:', this.players.black?.playerName);
      console.log('white player name:', this.players.white?.playerName);
    });

    this.socketService.onOpponentMove((move: { turn: any; gameState: any; color: string, from: string, to: string, flags: string, piece: string }) => {
      this.ngZone.run(() => {
        this.game.move(move);
        this.board.position(this.game.fen());
        // After an opponent move, switch the turn correctly
        if (this.game.turn() === 'w') {
          this.playerTurn = 'White'; // It's white's turn now
        } else {
          this.playerTurn = 'Black'; // It's black's turn now
        }
        console.log(`After move, current turn is: ${this.game.turn()}, playerTurn is: ${this.playerTurn}`);

        console.log('Opponent move received:', move);
        this.gameState = move.gameState;  // Update the game state based on opponent's move
        this.currentTurn = move.turn;  // Update the turn
        console.log('Turn after opponent move:', this.currentTurn);
        // Check if it's Black's turn and log player interaction logic
        if (this.currentTurn === 'b') {
            console.log("It's Black's turn");
        }
        if (this.currentTurn !== 'b') {
          console.log("Black player cannot move right now. Current turn is: " + this.currentTurn);
      }

      console.log('Opponent move received:', move);

  // Check if the move color is valid and update currentTurn
  if (move.color === 'w') {
    this.currentTurn = 'b';  // If white moves, it's now black's turn
  } else if (move.color === 'b') {
    this.currentTurn = 'w';  // If black moves, it's now white's turn
  } else {
    console.error('Invalid move color:', move.color);
    return;  // Early exit if the move color is invalid
  }

  console.log('Turn after opponent move:', this.currentTurn);

  // Check if it's the player's turn to move
  if (this.isPlayerTurn()) {
    this.allowPlayerMove();  // Enable player to move
  } else {
    this.disablePlayerMove();  // Disable player move if it's not their turn
  }

      });
    });

    this.socketService.onChatMessage((message: any) => {
      this.ngZone.run(() => {
        // Directly append the message to the chat
        this.chatMessages.push(message);
      });
    });

    this.socketService.onUndoMove((data: { fen: string, turn: string }) => {
      
  if (data && data.fen && data.turn) {
    this.game.load(data.fen);
    this.board.position(data.fen);
    this.currentTurn = data.turn;

    // Recalculate player turn
    this.playerTurn = data.turn === 'w' ? 'White' : 'Black';
    this._isPlayerTurn = this.game.turn() === this.playerColor;
  }
});

      // Listening for restart game event
  this.socketService.onRestartGame((data: any) => {
  console.log("Received restart game data:", data);
  if (data && data.gameState && data.turn) {
    // Reset board
    this.game.load(data.gameState);
    this.board.position(data.gameState);
    this.gameState = data.gameState;
    this.currentTurn = data.turn;

    console.log('Game restarted. Turn:', this.currentTurn);

    // Set player's own turn and color
    if (data.turn === 'w') {
      this.playerTurn = 'White';
    } else {
      this.playerTurn = 'Black';
    }

    // Fix: Set this._isPlayerTurn based on whether the turn matches playerColor
    this._isPlayerTurn = (data.turn === this.playerColor);

    console.log(`Game restarted. It's now ${this.playerTurn}'s turn.`);
  } else {
    console.error("Restart game data is missing game state or turn.");
  }
});

  }

  
  // Enable player to make a move (e.g., by showing valid move options on the board)
allowPlayerMove(): void {
  console.log('It is your turn! You can move now.');
  // Implement logic to highlight valid moves or enable pieces to be moved
}

// Disable player from making a move (e.g., by graying out the board or disabling the move UI)
disablePlayerMove(): void {
  console.log('It is not your turn! Please wait.');
  // Implement logic to disable the player's moves, e.g., gray out the board or lock the UI
}

  startGame() {
    const boardElement = document.getElementById('board1');
    if (!boardElement) {
      console.error('ChessBoard: element with id board1 not found');
      return;
    }

    this.game = new Chess();
    this.board = ChessBoard('board1', {
      draggable: true,
      position: 'start',
      orientation: this.playerColor === 'w' ? 'white' : 'black',
      onDrop: (source: string, target: string): string | undefined => {
        if (!this.isPlayerTurn()) {
          console.log(`It's not your turn! ${this.playerTurn} can move.`);
          return 'snapback'; // If it's not the player's turn, prevent the move
        }
        if (this.game.turn() !== this.playerColor) {
          console.log(`It's not your turn! ${this.playerTurn} can move.`);
          return 'snapback';
        }
        const move = this.game.move({ from: source, to: target, promotion: 'q' });
        if (!move) return 'snapback';

        // Send move to the server
        this.socketService.sendMove(this.gameId, move);
        this.updateTurn();
        return undefined;
      },
    });
    
  }

  isPlayerTurn(): boolean {
    // Return true if it's the player's turn to move
    const currentTurn = this.game.turn(); // 'w' or 'b'
    const playerColor = this.playerTurn === 'White' ? 'w' : 'b';
    console.log(`isPlayerTurn check: Current Turn: ${currentTurn}, Player Turn: ${playerColor}`);



    return currentTurn === playerColor; // Allow move only if it's the player's turn


  }

  updateTurn() {
    // Switch turns after a valid move
    this.playerTurn = this.playerTurn === 'White' ? 'Black' : 'White';
    console.log(`Switching turn. Previous Turn: ${this.playerTurn}`);
    console.log(`New Turn: ${this.playerTurn}`);
  }

  sendChatMessage() {
    if (this.currentMessage.trim()) {
      const msg = `<strong>${this.playerName}:</strong> ${this.currentMessage}`;
      this.socketService.sendChatMessage(this.gameId, msg);
      this.currentMessage = '';
    }
  }

  undoMove() {
    if (!this.gameId) return;
    console.log('Undo clicked, gameId:', this.gameId);
    this.socketService.undoMove(this.gameId);
  }

  restartGame() {
    const gameState = this.game.reset();
    const fen = this.game.fen();
    const turn = this.game.turn();
    this.board.start();
    this.socketService.restartGame(this.gameId, fen, turn);
  }
}
