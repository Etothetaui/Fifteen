# Fifteen

Python terminal games and experiments connecting tic-tac-toe with the numbers 1–9 and a magic square.

The board stores this magic square internally:

```text
6 1 8
7 5 3
2 9 4
```

Every winning row, column, or diagonal sums to **15**. Each player records the numbers behind their chosen squares; the game checks whether three of those numbers, including the latest move, sum to 15.

## Run

Requires Python 3 and a terminal that can display Unicode. There are no third-party dependencies.

```sh
python fifteen.py
```

On Windows, `py fifteen.py` also works when the Python launcher is installed. On systems where Python 3 is named `python3`, use `python3 fifteen.py`.

Two players take turns as **X** and **O**. Enter a board position from 1 through 9:

```text
1 2 3
4 5 6
7 8 9
```

These are position numbers, not the internal magic-square values. Get three marks in a row to win; a full board without a winner is a tie. Press Ctrl+C to exit.

## Files

| File | Purpose |
| --- | --- |
| `fifteen.py` | Two-player terminal game with functions and a small Player class. |
| `tictactoe.py` | Two-player variant organized into Game and Player classes. |
| `fifteen2.py` | Experimental computer opponent using minimax; the computer plays X and opens randomly. |
| `meta_board.py` | Experimental recursive boards with configurable levels and navigation between subboards. |
| `print_squares.py` | Standalone demonstration of flattening and printing nested square arrays. |

Run any script directly with Python to try it.

## Project status

This repository preserves the original five scripts from `15gamePython` in [Etothetaui/dumb_stuff](https://github.com/Etothetaui/dumb_stuff/tree/main/15gamePython), as viewed at source commit `ab5d6b830ec072b7657c961aaf0e1dea39286da6`.

These are learning experiments. Input validation can accept zero or negative positions through Python's negative indexing; use positions 1–9. The minimax variant is experimental and should not be treated as an unbeatable opponent. The recursive-board experiment does not yet detect wins or ties and runs until interrupted. Large level counts grow the board rapidly.

## License

Licensed under the GNU Affero General Public License, version 3.0 only (`AGPL-3.0-only`). See [LICENSE](LICENSE) for the full text.
