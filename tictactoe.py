#!/usr/bin/env python3
# Player Object. Takes symbol as argument
# Contains symbol and array of moves made
class Player:
    def __init__(self, sym):
        self.sym = sym
        self.squares = []
        
    # Function to check if player is a winner
    def isWinner(self):
        # Player can only win with a set of three, including the last move which
        # adds up to 15 due to the properties of magic squares
        for i in range(len(self.squares)-1):
            for j in range(i+1, len(self.squares)-1):
                if self.squares[i]+self.squares[j]+self.squares[-1] == 15:
                    return True
        return False

class Game:
    def __init__(self,x,o):
        # Declare board as a magic square
        self.board = [6, 1, 8,
                      7, 5, 3,
                      2, 9, 4]
        self.players = [x,o]
        # Initialize number of moves to zero
        self.turn = 0;

    # Function to print board. Prints an empty square if element is a number and
    # prints sym if a move has been made in that square
    def print_board(self):
        for i in range(len(self.board)):
            if isinstance(self.board[i], int):
                print("\u25A1", end =" ")
            else:
                print(self.board[i], end =" ")
            if i % 3 == 2:
                print()

    # Function to make a players move
    # Takes board and player as arguments
    def move(self, player):
        while True:
            # Check to see if player move is an integer and in range,
            # If not, throw exception
            try:
                square = int(input("Player " + player.sym + " Turn: "))-1
            except(ValueError):
                print("Invalid move, please try again")
                continue
                # If input is between 1 and 9 (inclusive) and the corresponding
                # spot on the board has not already been taken add move to
                #player's list of moves, add move to bard, and then print board
            try:
                bsquare = self.board[square]
            # If exception is thrown, print error message
            except(IndexError):
                print("Invalid move, please try again")
                continue

            # If invalid move print error message
            if not isinstance(bsquare, int):
                print("Square has already been played, please try again")
                continue
                    
            player.squares.append(bsquare)
            self.board[square] = player.sym

            self.print_board()
            print("-----")
            break
            
        return square

    def move_next(self):
        self.move(self.whos_turn())

    def whos_turn(self):
        return self.players[self.turn%2]

# Main function for game
def game():
    
    # Declare game with players
    game = Game(Player("X"), Player("O"))
    
    # Print blank board
    game.print_board()
    print("-----")

    # Loop for maximum 9 turns, since the board has only 9 elements in it
    while game.turn < 9:
        # Use mod 2 to alternate between the two players
        # Ask player for move and check if player has made a winning move
        # If player has won, print winning message and end game
        # Increment number of moves
        player = game.whos_turn()
        game.move(player)
        if player.isWinner():
            print("Player " + player.sym + " wins!")
            break
        game.turn += 1

    # If maximum of 9 moves have been played and the game has not been won
    # Then a tie has occurred. print tie message
    if game.turn == 9:
        print("It's a tie!")

if __name__ == '__main__':
    from version import parse_version_args
    parse_version_args()
    game()
