#!/usr/bin/env python3
"""Play magic-square tic-tac-toe with another human or the alpha-beta AI."""

import argparse

from version import parse_version_args

MAGIC_BOARD = (6, 1, 8, 7, 5, 3, 2, 9, 4)


class Player:
    def __init__(self, sym):
        self.sym = sym
        self.squares = []


def print_board(board):
    for i, square in enumerate(board):
        print("\u25A1" if isinstance(square, int) else square, end=" ")
        if i % 3 == 2:
            print()


def isWinner(player):
    # Only triples containing the latest move can create a new win.
    for i in range(len(player.squares) - 1):
        for j in range(i + 1, len(player.squares) - 1):
            if player.squares[i] + player.squares[j] + player.squares[-1] == 15:
                return True
    return False


def apply_move(board, player, square):
    """Apply a validated zero-based move for either a human or the AI."""
    if not isinstance(square, int) or not 0 <= square < 9:
        raise ValueError("Enter a position from 1 to 9.")
    if not isinstance(board[square], int):
        raise ValueError("Square has already been played, please try again.")
    player.squares.append(board[square])
    board[square] = player.sym


def move(board, player):
    while True:
        try:
            square = int(input(f"Player {player.sym} Turn: ")) - 1
        except ValueError:
            print("Enter a position from 1 to 9.")
            continue
        try:
            apply_move(board, player, square)
        except ValueError as error:
            print(error)
            continue
        return square


def choose_ai_move(board, player, engine):
    """Translate the game's magic-square board at the engine boundary."""
    from alpha_beta_engine import FifteenPosition

    cells = [0 if isinstance(cell, int) else (1 if cell == "X" else -1)
             for cell in board]
    position = FifteenPosition(cells, 1 if player.sym == "X" else -1)
    # Search to terminal positions with no deadline: no heuristic fallback can
    # weaken the never-lose guarantee from a legal starting position.
    result = engine.search(position, max(1, cells.count(0)))
    if result.move is None:
        raise ValueError("Cannot choose a move after the game is over.")
    return result.move


def game(ai=False, human="X"):
    if human not in ("X", "O"):
        raise ValueError("human must be X or O")
    engine = None
    if ai:
        from alpha_beta_engine import AlphaBetaEngine
        engine = AlphaBetaEngine()
        print(f"You are {human}. AI is {'O' if human == 'X' else 'X'}. X goes first.")
    board = list(MAGIC_BOARD)
    players = [Player("X"), Player("O")]
    print("Choose positions:\n1 2 3\n4 5 6\n7 8 9")
    print_board(board)
    print("-----")
    for turn in range(9):
        player = players[turn % 2]
        if ai and player.sym != human:
            square = choose_ai_move(board, player, engine)
            apply_move(board, player, square)
            print(f"AI ({player.sym}) chooses position {square + 1}.")
        else:
            move(board, player)
        print_board(board)
        print("-----")
        if isWinner(player):
            print(f"Player {player.sym} wins!")
            return player.sym
    print("It's a tie!")
    return None


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--ai", action="store_true", help="play against the alpha-beta AI")
    parser.add_argument("--human", choices=("X", "O"), default=None,
                        help="your symbol in AI mode: X goes first (default: X)")
    args = parse_version_args(parser)
    if args.human is not None and not args.ai:
        parser.error("--human requires --ai")
    try:
        game(ai=args.ai, human=args.human or "X")
    except (EOFError, KeyboardInterrupt):
        print("\nGame ended.")


if __name__ == "__main__":
    main()
