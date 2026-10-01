# Project instructions

- Before publishing a new set of changes to GitHub, increment the patch (last
  numeric) component of `version.py`'s `__version__` and keep the `-dev` suffix.
  Change major or minor components only when the user explicitly requests it.
- One version bump per published change set; do not bump again for retries of
  the same publication.
- Include a descriptive commit message, a CHANGELOG entry, updated README
  instructions, and relevant explanatory code comments with each publication.
- Keep version numbers out of source filenames and directory names.
- Run the relevant checks before publishing. The complete test command is
  `python -m unittest discover -v`.

- Use plain, functional UI labels and documentation. Do not add slogans,
  promotional copy, or commentary about the player's experience.
