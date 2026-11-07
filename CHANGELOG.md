# Changelog

All notable changes to ThumbPon are recorded here. The format follows [Keep a Changelog](https://keepachangelog.com/), and the project file format version is described in [docs/project-format.md](docs/project-format.md).

## [Unreleased]

### Added

- MIT License.
- Project format and compatibility policy document (`docs/project-format.md`).
- Per-layer pivot (project format version 8), group scaling, per-character text offsets, and a dialog to choose which thumbnails to export as PNG.
- Headless PNG export (`npm run export`) and the `thumbpon-usage` agent skill.

### Changed

- Projects saved in a newer format version than the app supports are no longer opened, so a newer file is never overwritten by an older app.
