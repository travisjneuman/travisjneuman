# AGENTS.md: GitHub Profile README Instructions

## Workspace storage conservation

<!-- workspace-scratch-storage-contract-v1 -->
Use only this repository's existing canonical live checkout. A dirty, divergent, detached, ambiguous, or concurrently owned checkout is a blocker: preserve it and stop. Do not create a clone, fork, worktree, feature branch, full repository/workspace copy, or external dependency/build environment to bypass that blocker. Never place repositories, worktrees, workspace copies, package installations, builds, or development servers under `/tmp` or `/private/tmp`, including aliases that resolve there. Small, bounded non-repository temporary files remain allowed. Load the Agent Operating Layer `workspace-scratch-storage-policy` contract through the workspace registry when available.


Last updated: 2026-07-02

## Project overview

This is Travis J. Neuman's public GitHub special profile repository. The
root README renders on the public GitHub profile and should act primarily as a
project/tool showcase with polished personal positioning and stable links to the
portfolio, LinkedIn, and selected project surfaces.

This repository is public. Treat every committed file, comment, asset reference,
and workflow note as public-facing.

## Active content model

- `README.md` is the current live profile README source.
- `README2.md` was a temporary side-by-side comparison draft and was promoted to
  `README.md` on 2026-07-02. Do not recreate comparison drafts unless Travis
  explicitly asks for another side-by-side review file.
- The approved direction as of 2026-07-02 is project-first rather than
  career-first: showcase built products, tools, open-source work, private
  product boundaries, and production-minded engineering habits.
- Lazy Golfing should be treated as the flagship project: a public live product
  backed by private frontend/backend repositories. It may be described in terms
  of product scope, architecture, and verified public-safe metrics, but private
  repo URLs, implementation secrets, operational details, and sensitive data must
  not be exposed.
- Career details should stay concise here. Direct deeper career/context needs to
  the public portfolio and LinkedIn rather than turning this README into a
  resume.

## Showcase facts system and project cards (2026-10)

Reviewed canonical facts feed selected profile and portfolio surfaces. Read
`showcase/README.md` for the actual CLI, schema, privacy and evidence contracts.

- **Facts:** public projects own `showcase.json`; reviewed public-safe local
  snapshots live in `showcase/local/<id>.json`. The checked-in v1 schema is
  enforced without dependencies. Metric `source` is inert provenance, never a
  command to execute. Dates describe source evidence, not consumer execution.
  Optional stable metric keys and public-safe provenance objects are preserved.
- **Presentation:** `showcase/registry.json` owns card, table and explicitly
  marked project prose templates (`showcase:prose-<id>`). Reference canonical
  values/labels via explicit metrics, using stable keys or legacy indexes with
  `expectLabel` guards. Missing references fail rather than preserve stale numbers.
- **Sync:** `node scripts/showcase/sync-showcase.mjs` writes the aggregate,
  marked README cards/table/prose and sibling portfolio TypeScript, keeping all
  metrics and per-project/per-metric evidence. It is offline by default.
  Reuse existing reviewed facts via `--source-file=id=/absolute/existing/showcase.json`.
  Missing intended sources or portfolio checkout fail; `--profile-only` is an
  explicit opt-out, never implicit. All intended outputs are preflighted and
  staged before promotion. Never hand-edit generated outputs.
- **Privacy:** the existing denylist stays fail-closed. Use `SHOWCASE_DENYLIST`
  or bounded existing `SHOWCASE_DENYLIST_JSON_FILES` selections outside the repo.
  Remote facts and remote denylist inputs require separate explicit CLI gates;
  no privacy-disable option exists. Local JSON does not waive configured URL
  protections; equivalent replacements require explicit review. Repeat bounded
  `--public-file=/absolute/existing/file` to guard all proposed public portfolio
  consumers, separate snapshots and SVG labels before writes without modifying
  those selections. Asset pixels need separate approval/review. Never print or
  commit privacy inputs.
- **Zero testing:** do not run tests, checks, lint, syntax checks, sample runs,
  builds or recounts unless Travis explicitly requests them. Review code/diffs
  and the actual authorized writer's output. The old `--check` exception does
  not authorize a check in a current task.
- **tjn.claude/** counts, local facts and the README `claude-counts` paragraph
  are owned by `~/.claude/scripts/generate-counts.mjs`. The wrapper delegates to
  that producer; it is not a second counter or a consumer-only copy. Invoke the
  producer once with both destinations for a joint update. Keep `portfolio:false`
  and no generic Claude card: the entire generic overlay entry is excluded.
- **Coverage:** generic card/table and marked project prose inventory claims
  use canonical references. Unmarked prose, structural wording, badges, case
  studies and image pixels may remain manual. Do not claim universal freshness
  or coverage. Historical archive and operating-cost figures stay historical,
  with their original evidence dates. Static source declarations are not live
  route/database totals; link occurrences are not unique resources.
- **Cards/media:** light/dark SVGs use existing prepared assets. Facts sync does
  not render or capture media. Media commands are a separate authorized lane on
  TJN-DESK in a dated non-repo work folder; never install a browser payload here.
  Source logos are copy-only and private screenshots require sanitization before
  release. Follow the Agent Operating Layer media/browser contracts.

## Public copy style (owner rule, 2026-10-05)

The README is read as Travis's own voice. Keep it that way:

- No em dashes (—) anywhere in public files, and no spaced en dashes used as em dashes.
  Use a colon, comma, parentheses, or a new sentence.
- First person, plain words, short sentences. No slogans, "Philosophy:" blocks, emoji
  headings, "not X but Y" setups, or filler like "leverage", "seamless", "robust",
  "showcase", "demonstrates".
- Only verified facts. Employers stay unnamed ("my company"). The AI Catalyst line says
  "selected for my company's AI Catalyst program" and the role only, no outcomes until
  they are documented.
- Project headings are plain (`### [Name](url)`), so anchors are simple slugs
  (`#lazy-golfing`, `#ndevlearn`). If a heading changes, update the matching `anchor`
  and table `project` links in `showcase/registry.json` and re-run the sync.

## Operating rules for AI agents

- Read before editing: inspect the target README/AGENTS/workflow file and nearby
  assets before proposing or changing public content.
- Preserve the visual-heavy profile style unless Travis explicitly asks for a
  visual redesign. Do not replace badges, logos, banners, animations, or graphics
  during copy/accuracy work.
- Prefer enhancement and accuracy polish over full rewrites unless Travis
  explicitly approves a replacement.
- Keep GitHub profile README rendering compatible with GitHub-flavored Markdown
  and GitHub's profile README behavior.
- Preserve existing documentation, assets, and workflows. Do not delete docs,
  media, or generated/profile assets unless Travis explicitly asks.
- Do not modify `CLAUDE.md` if one is added later.
- Follow higher-level/current-session git instructions for committing and
  pushing. For approved changes in this Travis-owned repo, commit and push after
  verification unless Travis explicitly says not to.
- Use Git identity `Travis J. Neuman <travis@neuman.dev>` for commits. Never add
  agent-attribution trailers such as `Co-Authored-By: Codex`.

## Public-safety rules

- No secrets: never print, commit, or invent credentials, tokens, cookies,
  private keys, OAuth secrets, API keys, personal data, or production-only
  configuration. Use placeholders in docs/examples.
- Do not expose private repository URLs, internal IP addresses, hostnames,
  topology details, deployment commands, production config, customer/user data,
  or private operational runbooks.
- Keep employer/customer details out of this repo unless Travis explicitly
  approves the exact public wording for this surface.
- Private notes and private repos may be used as source material when available,
  but only public-safe summaries and verified claims belong here.
- Certificates/training should not be added as one-off profile claims unless
  Travis approves a broader public profile credentials section.
- For Lazy Golfing, acceptable public framing includes: live public product,
  private codebase, full-stack architecture, product features, high-level
  security/operations posture, and verified non-sensitive counts. Do not link or
  expose private frontend/backend/source repositories.

## Project claims and accuracy

- Keep project metrics, public links, and technology claims accurate against
  source repositories, public project pages, or approved private notes.
- Prefer rounded/stable metrics when exact counts drift often, unless Travis
  asks for exact current counts.
- If a repo is private, label the project honestly without implying source access.
- Avoid overstating certifications, production scale, user counts, revenue,
  security posture, or availability.
- If a project has changed direction, update copy to reflect the current state
  rather than preserving stale hype.

## Workflow and automation constraints

- The existing snake animation workflow is historically approved/restored. Do not
  disable, delete, or mutate it without reviewing workflow history, current file
  contents, relevant project notes, quota impact, and getting current-session
  approval for the exact change.
- Do not create new GitHub Actions, scheduled CI, deployments, or other
  quota-consuming automation from this repo without explicit current-session
  approval.
- Workflow commits or branch publications must use Travis' git identity where
  technically possible.

## Validation expectations

Before committing public profile changes:

- Review the diff and touched code for intended changes and public-safe content.
- Review existing asset/link references and Markdown without running check scripts
  or making network requests unless the current task explicitly authorizes them.
- If Travis explicitly asks for a comparison draft, keep `README.md` untouched until promotion is approved.
- Confirm public/private project boundaries are preserved.
- Commit and push only after the above checks pass and the current session allows
  publishing.

## Build, test, and local commands

Do not run build/test/check commands for README/AGENTS or facts repairs without
Travis's explicit request. Review diffs and touched code instead. An authorized
actual writer is distinct from a check or sample execution; it does not authorize
extra validation commands, recounts or media generation.
