# AGENTS.md

This repository already stores its project workflow in `CLAUDE.md`, `CLAUDE.repo.md`, and `.claude/`.
When Codex works in this repo, treat those files as the primary project instructions.

## Bootstrap

At the start of a task, read these files in order:

1. `.claude/Feedback.md`
2. `TODO.md`
3. `.claude/Progress.md`
4. `CLAUDE.md`
5. `CLAUDE.repo.md`

If a file uses `@path` notation, interpret it as a repository-relative file reference and open that file.
Example: `@.claude/Feedback.md` means `.claude/Feedback.md` in the repo root.

## Working rules

- Follow the development process described in `CLAUDE.md` and `CLAUDE.repo.md`.
- Keep `TODO.md`, `.claude/Progress.md`, and `.claude/Feedback.md` consistent when work requires those updates.
- Before large changes, check whether a matching plan exists in `docs/plans/`.
- Record reusable implementation knowledge in `docs/knowhow/` when the project workflow calls for it.
- Use the Japanese commit style defined in `CLAUDE.repo.md`.
- When you need Claude-style sub-agents or slash commands, follow `docs/codex-subagents.md`.

## Codex mapping

When Claude-specific documents mention commands, sub-agents, or slash commands, preserve the intent in Codex with the closest available workflow.
Prefer reading the referenced files and applying the documented process over ignoring the instruction because the tool name differs.
