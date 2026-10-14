# Contributing

Contributions are welcome: bug fixes, worked examples from published books, comparisons with other software, translations and accessibility improvements. Issues labelled [good first issue](https://github.com/chethandvg/vedic-astrology-toolkit/labels/good%20first%20issue) are a good place to start.

## Contributor License Agreement

Before a pull request can be merged, you need to sign the [Contributor License Agreement](CLA.md) once. A bot comments on your first pull request; reply with the sentence it asks for. You keep the copyright in your work.

## Before you open a pull request

- **Python toolkit:** `python -m unittest discover -s tests -t .`
- **Web app** (in `web/`): `npm test`, `npm run typecheck` and `npm run e2e`
- If you change a calculation, regenerate and check the golden fixtures: `python web/scripts/gen_fixtures.py` then `python web/scripts/compare_fixtures.py`
- Keep commits small, with messages that say what changed and why.
- New source files start with the project's SPDX header (copy it from any existing file).
- Interpretation texts must be original, plain and non-fatalistic; never copy wording from books or websites.

## License

By contributing you agree that your contribution is licensed as described in [CLA.md](CLA.md), and that the project is distributed under the AGPL-3.0-or-later with the additional terms in [NOTICE](NOTICE).
