#!/usr/bin/env python3

# Player Object. Takes symbol as argument
# Contains symbol and array of moves made
class Player:
    def __init__(self, sym):
        self.sym = sym
        self.squares = []

# Function to print board. Prints an empty square if element is a number and
# prints sym if a move has been made in that square
def print_board(board):
    for i in range(len(board)):
        if isinstance(board[i], int):
            print("\u25A1", end =" ")
        else:
            print(board[i], end =" ")
        if i % 3 == 2:
            print()

# Function to check if player is a winner
def isWinner(player):
    # Player can only win with a set of three, including the last move which
    # adds up to 15 due to the properties of magic squares
    for i in range(len(player.squares)-1):
        for j in range(i+1, len(player.squares)-1):
            if player.squares[i]+player.squares[j]+player.squares[-1] == 15:
                return True
    return False

# Function to make a players move
# Takes board and player as arguments
def move(board, player):
    while True:
        # Check to see if player move is an integer and in range,
        # If not, throw exception
        try:
            square = int(input("Player " + player.sym + " Turn: "))-1
            # If input is between 1 and 9 (inclusive) and the corresponding
            # spot on the board has not already been taken add move to
            #player's list of moves, add move to bard, and then print board
            if isinstance(board[square], int):
                player.squares.append(board[square])
                board[square] = player.sym

                print_board(board)
                print("-----")
                break
            # If invalid move print error message
            else:
                print("Square has already been played, please try again")
        # If exception is thrown, print error message
        except(ValueError, IndexError):
            print("Invalid move, please try again")
    return square

# Main function for game
def game():
    # Declare board as a magic square
    board = [6, 1, 8,
             7, 5, 3,
             2, 9, 4]
    # Declare players
    players = [Player("X"), Player("O")]
    # Initialize number of moves to zero
    turn = 0;

    # Print blank board
    print_board(board)
    print("-----")

    # Loop for maximum 9 turns, since the board has only 9 elements in it
    while turn < 9:
        # Use mod 2 to alternate between the two players
        # Ask player for move and check if player has made a winning move
        # If player has won, print winning message and end game
        # Increment number of moves
        move(board, players[turn%2])
        if isWinner(players[turn%2]):
            print("Player " + players[turn%2].sym + " wins!")
            break
        turn += 1

    # If maximum of 9 moves have been played and the game has not been won
    # Then a tie has occurred. print tie message
    if turn == 9:
        print("It's a tie!")

if __name__ == '__main__':
    from version import parse_version_args
    parse_version_args()
    game()
