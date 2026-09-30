"""Single source of truth for the Fifteen application version."""

__version__ = "0.0.0-dev"


def parse_version_args():
    """Handle the shared command-line version flag before starting a game."""
    import argparse

    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--version", action="version", version=f"Fifteen v{__version__}")
    return parser.parse_args()


if __name__ == "__main__":
    print(__version__)
