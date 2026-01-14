# Contributing

## Safe parallel Codex workflow
- Use one agent at a time on a single branch when possible.
- If running agents in parallel, use separate branches or `git worktree` clones.
- Split work by feature/file to avoid overlapping edits.
- Sync often: fetch + rebase/merge before touching shared files.
- If both need Docker running, use different compose project names and port overrides.
- Merge one agent at a time and resolve conflicts immediately.
