"""Experimental tic-tac-toe computer opponent using minimax.

The computer plays X and the human plays O. The search has known correctness
issues and is not a reliable or unbeatable opponent.
"""

import random

class Game:
    def __init__(self, sym1, sym2):
        self.board = [6, 1, 8, 7, 5, 3, 2, 9, 4]
        self.players = [Player(self, sym1), Player(self, sym2)]
        self.turn = 0

    def printBoard(self):
        for i in range(9):
            if isinstance(self.board[i], int):
                print("\u25A1", end=" ")
            else:
                print(self.board[i], end=" ")
            if i % 3 == 2:
                print()

    def state(self):
        if self.players[0].isWinner():
            return 1
        elif self.players[1].isWinner():
            return -1
        else:
            return 0

    def isGameOver(self):
        return True if self.state() !=0 or self.turn == 9 else False

    def bestMove(self, player):
        for i in range(len(self.board)):
            if isinstance(self.board[i], int):
                if self.minimax(player, i, self.turn, False) == 1:
                    return i
        return -1

    def minimax(self, player, move, depth, maxPlayer):
        if self.isGameOver():
            return self.state()

        other = self.players[(self.players.index(player)+1)%2]

        if maxPlayer:
            maxEval = -1
            player.move(move)
            for i in range(len(self.board)):
                if isinstance(self.board[i], int):
                    eval = self.minimax(other, i, depth-1, False)
                    maxEval = max(maxEval, eval)
            player.undoLastMove(move)
            return maxEval
        else:
            minEval = 1
            player.move(move)
            for i in range(len(self.board)):
                if isinstance(self.board[i], int):
                    eval = self.minimax(other, i, depth-1, True)
                    minEval = min(minEval, eval)
            player.undoLastMove(move)
            return minEval

class Player:
    def __init__(self, parent, sym):
        self.parent = parent
        self.sym = sym
        self.squares = []

    def isWinner(self):
        for i in range(len(self.squares)-1):
            for j in range(i+1, len(self.squares)-1):
                if self.squares[i]+self.squares[j]+self.squares[-1] == 15:
                    return True
        return False

    def setMove(self):
        return int(input("Player " + self.sym + " Turn: "))-1

    def move(self, move):
        if isinstance(self.parent.board[move], int):
            self.squares.append(self.parent.board[move])
            self.parent.board[move] = self.sym
        else:
            raise Exception
        return move

    def undoLastMove(self, lastMove):
        self.parent.board[lastMove] = self.squares.pop()

def main():
    game = Game('X', 'O')
    winner = None

    lastMove = game.players[game.turn%2].move(random.randint(0,8))
    game.printBoard()
    print("-----")

    game.turn += 1

    while game.turn < 9:
        if game.turn%2 == 0:
            move = game.bestMove(game.players[game.turn%2])
            lastMove = game.players[game.turn%2].move(move)

            game.printBoard()
            print("-----")
        else:
            while True:
                try:
                    move = game.players[game.turn%2].setMove()
                    lastMove = game.players[game.turn%2].move(move)
                    break
                except(ValueError, IndexError):
                    print("Invalid move, please try again")
                except(Exception):
                    print("Square has already been played, please try again")

        game.turn += 1

        if game.state() == 1:
            winner = game.players[0]
            break
        elif game.state() == -1:
            winner = game.players[1]
            break

    if winner == None:
        print("It's a tie!")
    else:
        print("Player " + winner.sym + " wins!")


if __name__ == '__main__':
    from version import parse_version_args
    parse_version_args()
    main()
