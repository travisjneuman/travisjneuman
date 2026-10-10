# Showcase facts and consumers

`sync-showcase.mjs` copies reviewed snapshots. It does not count files, run metric
`source` strings, refresh measurements, fetch screenshots, or render cards.

## Actual write

From this checkout, after canonical producers have written their snapshots:

```sh
node scripts/showcase/sync-showcase.mjs
```

Default is offline and includes the existing sibling portfolio. Missing facts,
invalid schema/rounding, unresolved references, missing or duplicate README
regions, missing portfolio `src/lib/data/projects.ts`, and privacy hits stop the
write. All intended output strings are computed and privacy-scanned first.
Changed files are staged beside their destinations before renaming; a filesystem
failure during promotion is reported, but multiple renames are not a transaction.
Both the profile and portfolio checkout need the ignored pattern
`*.showcase-stage-*` for these same-directory transient files. The portfolio
owner maintains its `.gitignore`; the profile writer does not edit that file.

Use reviewed public-safe files from existing off-host checkouts when necessary:

```sh
node scripts/showcase/sync-showcase.mjs \
  --source-file=neumanos=/absolute/existing/showcase.json \
  --source-file=ndev-learn=/absolute/existing/another-showcase.json
```

Add existing proposed public consumer artifacts to the same privacy scan before
any write, without modifying those selections:

```sh
node scripts/showcase/sync-showcase.mjs \
  --public-file=/absolute/existing/portfolio/src/lib/data/projects.ts \
  --public-file=/absolute/existing/portfolio/src/lib/data/caseStudies.ts \
  --public-file=/absolute/existing/proposed-public-snapshot.json \
  --public-file=/absolute/existing/prepared-card.svg
```

Repeat `--public-file=/absolute/existing/file` for each consumer artifact or SVG
label output. There is no directory/glob discovery. The publishing owner must
select all changed portfolio consumers, separate JSON snapshots, and prepared
SVGs that are not already the writer's three automatic output strings. A public
selection is read-only and cannot alias a write destination, even by symlink;
automatically written outputs are already scanned in their proposed form.
Each selection must be an existing regular UTF-8 file, at most 8 MiB, with up to
32 distinct selections. Files are read in full with bounded reads, not truncated
or filtered to only markup labels. Missing/unreadable files, directories, invalid
UTF-8 and oversized files stop all writes with no source path or input value in
the error. SVG textual labels are covered; encoded image pixels (including SVG
data images), screenshots and other asset pixels need separate approval/review.
This text guard cannot certify their content. Complete preparation before this
actual write; a later public edit or media write needs its own owner review.

Repeat `--source-file=id=/absolute/existing/showcase.json` once per registered id.
Overrides take precedence over both registry local snapshots and sibling facts.
Without an override, an explicit registry local source is required as configured;
public sources use existing same-name sibling checkouts. No clones or commands
are created to obtain missing data. `--profile-only` explicitly omits the portfolio
output; never the default. `--allow-remote-sources` explicitly permits only the
registered public GitHub raw facts fallback when a sibling facts file is absent.
It does not replace unreadable or invalid local facts. Do not use remote options
without authorization for those requests.

`--check` remains a read-only drift mode for compatibility, not a recommended
validation step. No tests, checks, recounts, builds or rendering are authorized by
this contract. Review code/diffs and the actual writer's output.

## Privacy stays fail-closed

- `SHOWCASE_DENYLIST`: existing newline file, default
  `~/.config/showcase/denylist.txt`.
- `SHOWCASE_DENYLIST_JSON_FILES`: comma-separated absolute paths to existing
  local JSON. Name/alias strings are collected recursively, just like the prior
  remote lane. Select reviewed local copies without exposing their paths/data.
- `SHOWCASE_DENYLIST_JSON_URLS`: retain every configured URL. Each requires either
  an explicit reviewed local counterpart selected by `--denylist-url-file` or
  `--allow-remote-denylist` for its fetch. Adding local JSON does not supersede
  configured URLs. Never unset URL protection or omit the owner's existing
  configuration simply to get an offline run through. All URLs, including mapped
  ones, must remain HTTPS without credentials; remote redirects are refused.

After reviewing source equivalence, keep the existing configuration loaded and
select the existing canonical counterpart for only the intended URL position:

```sh
source "$HOME/.config/showcase/env.zsh"
node scripts/showcase/sync-showcase.mjs \
  --denylist-url-file=1=/absolute/existing/franchises.json
```

Repeat `--denylist-url-file=position=/absolute/existing/file` for independently
reviewed counterparts. Positions are 1-based in the trimmed, nonempty configured
URL list, not in the combined file/URL list. Each position must exist; repeated
positions, relative paths, unavailable/non-regular files, invalid UTF-8/JSON,
oversized reads and selections with no meaningful usable name/alias terms stop
all writes. Each selected filename must exactly equal the URL's final pathname
component, including case and extension. There is no alternate-name heuristic or
automatic filesystem fallback. URL query parameters do not change that component.
The full JSON is traversed for all name/alias strings, including nested arrays;
selection does not filter to counted seasons, represented identities or headline
metrics. The unchanged owner-identity exemption still applies. The only additional
extraction rule is the privately pinned missing-manager scalar described below.

**Equivalence is the caller's reviewed requirement, not a filename guarantee.**
Before selecting a file, establish from existing static application source that
the configured URL serves that canonical JSON namespace and that the current
local file is its complete counterpart. For an alias registry, protect all
canonical names, display names, manager aliases and team aliases, not a subset or
count evidence file. Record the private-safe source ID, source HEAD, snapshot
SHA256 and static-path lineage in the private handoff, never the payload, identity
values, protected URL or credentials in public documentation. This identifies a
reviewed local snapshot, not a network observation of deployed bytes. If lineage,
completeness or currency cannot be established, stop; do not manufacture a local
replacement or clear configuration.

### Reviewed missing-manager extraction contract

The optional private policy is `~/.config/showcase/reviewed-registry.json`. The
publishing owner maintains it; this writer neither creates nor updates it. Its
exact JSON object contract, also used independently by the Claude safety module,
is:

```json
{
  "schemaVersion": 1,
  "urlSlot": 1,
  "basename": "franchises.json",
  "sha256": "<reviewed full-file digest: 64 lowercase hexadecimal characters>",
  "adapter": "unidentified-manager-v1"
}
```

The digest placeholder must equal the approved snapshot SHA256 compiled into
this adapter version as `REVIEWED_REGISTRY_SHA256`:
`8f6cef0da8d631305848a2e66422f1c9f14f9b97af7c8b8f052127f8abaaf4fa`.
No other digest, extra keys, schema versions, slots, basenames or adapter names
are accepted. Both this source constant and the private pin bind
`unidentified-manager-v1` to that approved snapshot; changing the private pin
alone cannot authorize a future snapshot. No pin means ordinary full name/alias
protection, not an automatic schema exception. An unreadable/malformed existing
policy, missing configured slot 1 or its explicit local counterpart, basename
mismatch or changed input/reviewed metadata blocks publication pending renewed
review and an explicit source update. The adapter has no remote fallback.
Hashing covers the complete bounded original input bytes, including any BOM, before UTF-8 decoding
or JSON parsing, not reencoded text or JSON serialization. Traversal uses that
same read; no second file read supplies a different extraction payload.

Only the pinned slot 1 counterpart may use `unidentified-manager-v1`. Ordinary
local JSON inputs, other URL slots and literal policy data always use the normal
walker, even with the same filename, digest or similar records. The pinned root
must have its own `franchises` array. A candidate must be a direct record in that
array with all eight own fields: `id`, `slug`, `name`, `displayName`,
`managerAliases`, `teamAliases`, `primaryColor`, `secondaryColor`. Identity and
display fields must be meaningful strings (trim-nonempty with at least one
Unicode letter or number, without a three-character minimum); both colors must
be trim-nonempty strings. `managerAliases` must be an empty array; `teamAliases`
must be a nonempty array of strings meeting that same meaningful criterion.
Only the own scalar `name` whose raw string equals `Unknown` case-insensitively
is omitted. There is no trimming, punctuation
normalization or substring matching in that decision. Unknown/changed record
shapes keep normal protection; a changed root fails closed.

Every other property is still traversed normally: display names, team aliases,
manager aliases, nested objects and unrelated root fields. An `Unknown` display
name or alias, or explicitly supplied literal `unknown`, therefore remains
protected. There is no global stopword/allow-set addition, output exception,
source rewriting or privacy-disable option. Final public-string scans, usable
term gates and all additive sources remain unchanged.

Static application source (`tkl.home/data.js:624–635,930–941`) distinguishes the
manager label from the franchise display identity and documents the unresolved
manager fallback. That evidence supports this scalar interpretation, not a
perpetual exemption for future snapshots or arbitrary changed shapes. The
private policy must match this source version's approved digest; it is trusted
owner-review input, not independently established deployed-byte equivalence.
Slot/basename alone never authenticate a counterpart. No cross-checkout module
is imported. This extractor resides in `scripts/showcase/sync-showcase.mjs` and
must be included wherever the producing source's digest evidence is retained.

A mapping replaces only that URL slot's fetch. The literal denylist, all configured
local JSON and every other URL remain additive and required. Any unmapped URL
still fails offline unless its remote fetch is explicitly permitted. A mapped
file must itself yield meaningful terms even when another input has usable terms.
There is no option to waive or disable any other protection input.

JSON input is bounded to 2 MiB per source using bounded regular-file reads,
privacy JSON selection to eight sources (a mapped slot is counted once), and
remote reads to 15 seconds per request. Configured unreadable privacy inputs fail
closed. No usable terms means no write; there is no privacy-disable flag. Errors
do not print denylisted terms, input data, selected privacy paths or source URLs.

## Schema, templates and evidence

The dependency-free validator enforces the checked-in v1 source schema: required
fields and types, allowed statuses/visibility/rounding, date validity, public link
formats, metric requirements and unknown-field rejection. Metrics can have an
optional unique `key`; references use exactly one of `{ "facts": "id", "key":
"tools" }` or legacy `{ "facts": "id", "index": 0 }`. A missing key never falls
back to an index or old text. Claude keys are `skills`, `agents`, `community`,
`repos`; aiup keys are `tools`, `platform`, `background`. Legacy producers need not
add keys until their own writer can maintain them.

Card `metrics`, table row `metrics`, and registry `prose` region `metrics` are
explicit reference arrays. Legacy index references can require `expectLabel`,
which must exactly match the canonical label before any presentation override.
This prevents a reordered producer from silently substituting another metric.
Templates in card `alt`/`lines`, table `what`, and prose `text` use `{v0}` for value, `{l0}` for displayed
label, `{m0}` for value plus lowercase label, or `{d0}` for its measurement date. `{w0}`/`{W0}` spell exact integers
0 to 20 in lowercase/title case, preserving existing prose such as "Nineteen
seasons". Unknown or unresolved placeholders fail. A reference's optional
`label` overrides only presentation; `canonicalLabel` is retained in card
`metricFacts`. Legacy learning references retain checked labels for compatibility. Reviewed
NeumanOS and Plex snapshots, and aiup's producer, supply explicit stable keys.

Registry `prose` is an array of `{ "id": "project-slug", "metrics": [...],
"text": "..." }`. Each unique lowercase id requires exactly one README region:
`<!-- showcase:prose-project-slug:start ... -->` through
`<!-- showcase:prose-project-slug:end -->`. The writer replaces only that marked
region, not headings, badges or surrounding project copy. Current ids are
`lazy-golfing`, `neumanos`, `ndev-learn`, `learn-python`, `aiup`, `thedeadrobot`,
and `fantasy-analytics`. The separate `claude-counts` markers are not part of this
namespace and stay under the Claude producer's ownership.

Profile-owned local metric keys are:
- Lazy Golfing: `declared-http-methods`, `page-files`, `model-definitions`,
  `module-definitions`, `migration-files`.
- Fantasy Analytics: `seasons`, `matchups`, `franchises`, `archive-files`.
- Personal Dashboard: `csv-commands`, `categories`.
- thedeadrobot: `monthly-cost`, `rss-sources`, `llm-providers`.
- Homelab: `virtualization`, `network`, `services`.
- ndev.t3code: `surface`, `base`, `status`.

When the publishing owner replaces local snapshots with reviewed curated facts,
retain these keys on the corresponding metrics. Missing keys fail closed rather
than selecting a positional fallback. No key addition refreshes a measurement.

`floor-2sig` requires a positive integer lower bound ending in `+`, aligned to
two significant digits. `floor-100` explicitly records Claude's floor-to-hundreds
display (including a possible zero lower bound); it is not two-significant-digit rounding. This validates the already-rendered value only. It
cannot prove a raw measurement or freshness. `exact` permits versions, platform
baselines, currency and textual architectural facts as well as integers.

Aggregate `facts` retains all projects and metrics, their `updated`, `source`,
`asOf`, `round`, keys and optional project/metric `provenance` objects. Those
objects are public-safe producer evidence, not executable instructions. Cards
retain renderer-compatible `[value, label]` tuples plus `metricFacts` and project
provenance. Portfolio TypeScript retains every metric and its evidence while
keeping `label`/`value` strings compatible with existing consumers. Aggregate
`updated` is only the maximum source document date, not a new measurement date.
No timestamp is invented during consumption.

## Ownership and remaining manual claims

Claude's canonical producer owns `showcase/local/tjn-claude.json` and the README
`claude-counts` paragraph. `portfolio:false` excludes the entire Claude entry from
the generic portfolio overlay; no generic Claude card is added. Generic sync
uses its status for the table and retains its evidence in aggregate facts.
`scripts/sync-claude-counts.sh` delegates a write to that producer; it is not a
consumer-only copy. For both destinations, invoke the canonical producer once:

```sh
node "$HOME/.claude/scripts/generate-counts.mjs" --write \
  --travis-repo=/absolute/existing/profile \
  --portfolio-repo=/absolute/existing/portfolio
```

Generic templates cover count-bearing inventory/cost claims in card lines, table
prose and the seven explicit project prose regions. The initial marker contents
are not a refresh: the publishing owner must first install reviewed source facts
and then invoke the actual writer. Structural wording such as "one HTML file"
remains manual. Technology badges, unmarked prose, case studies, image pixels and
service metadata are not rewritten by generic sync.

Lazy Golfing prose describes static declared controller methods, page files and
model definitions, never live/registered endpoints or database tables. Unsupported
API-module/migration totals are removed on the next write. NeumanOS prose uses
built-in widget facts and removes unsupported optional-provider totals and the
"Excel-compatible" formula claim. The card retains formula exports only as an
explicitly dated 2026-10-05 snapshot: exports do not certify supported formulas.
Learning link references mean HTTP(S) token occurrences including repetitions
and frontmatter, not unique resources. Learn Python prose takes projects, levels
and modules from facts and removes the unverified concept-guide total. Fantasy
matchups are historical unique matches through 2025, excluding 2026; curated
facts correct the old 1,800+ claim to 1,700+ for 1,724 matches. Saved historical
archive/cost figures keep their evidence dates and qualifiers; copying is not a
fresh count. The aiup background claim still needs the producing repo's reviewed
architectural definition, not a consumer's grep.

Card rendering and media preparation are separate owner-controlled steps. These
facts repairs do not imply that screenshots or SVG assets have been refreshed.
