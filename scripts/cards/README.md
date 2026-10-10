# Card media helpers

These are manual, source-only entry points. Facts sync does not render media.
Run production only on TJN-DESK through `desk-run.ps1`, which sets
`TJN_MEDIA_WORK` to a dated `D:\LazyGolfing-Work\Jobs\<slug>-<yyyy-mm-dd>`
folder. The helpers reject other hosts, missing job folders, paths outside the
job, symlinks, junctions, git checkout paths and existing outputs. They never
write into the repository or Proton.

Publish helper source before using it for production. The helpers read
`showcase/projects.json` relative to their source location, not their working
directory. Invoke the published canonical entry points. If source is copied
into a job, keep `media-work.mjs` beside both entry points and supply the same
relative `showcase/projects.json` layout. A copied, already-published renderer
can instead be used for a separately authorized run with a filtered derived
projects JSON. Record that published source revision: do not claim it exercised
these new guards. Do not run unpublished helper edits merely to validate them.

## Stage inputs first

Copy only the selected prepared screenshots, fonts and optional prepared logos
into the job, keeping this layout:

```text
assets/cards/src/fonts/Geist-Variable.woff2
assets/cards/src/fonts/GeistMono-Variable.woff2
assets/cards/src/<id>-dark.jpg
assets/cards/src/<id>-light.jpg
assets/cards/src/<id>-logo.png       (optional)
```

Copy source logos, never edit, move, rename or delete an original. Compare the
job copy's SHA256 with the source before rendering. For already prepared logos,
compare the staged PNG with its prepared source PNG. The SVG generator embeds
only these staged inputs; it never loads an image or font from the repository.
Review sanitized screenshots and both theme outputs separately: path guards and
text escaping do not inspect image pixels for privacy or stale counts.

## Generate selected SVGs

Command passed to the existing production runner, using the published script's
absolute path:

```text
node "<published-repo>/scripts/cards/generate-cards.mjs" --card=aiup --card=learning
```

`--card=<id>` is mandatory and repeatable. There is no implicit all-cards mode.
Unknown IDs, duplicate selections, duplicate JSON IDs, malformed selected card
text and missing required staged inputs fail before writing. An absent prepared
logo keeps the existing logo-free composition. Each selected card produces both
`assets/cards/<id>-dark.svg` and `assets/cards/<id>-light.svg` under the job.
The composition, embedded fonts, colors and fixed filenames remain unchanged.
All selected SVG buffers are built before any output is created.

## Prepare copied media with existing Sharp

Raw input copies must also be inside the job, preferably in a separate `inputs/`
folder so derived names cannot collide with source names:

```text
node "<published-repo>/scripts/cards/prepare-media.mjs" aiup inputs/dark.png inputs/light.png inputs/logo.svg --logo-sha256=<64-hex-source-sha256> --sharp-module="<existing-absolute-path>/node_modules/sharp"
```

Paths resolve relative to the job; absolute input paths are accepted only inside
that same job. Supply a source SHA256 when a logo copy is supplied; a hash
without a logo is also rejected. The helper compares the staged bytes with that
hash before invoking Sharp. Original logos are never read by the converter.
The optional logo must have a distinct input name from the derived output.

`--sharp-module` selects an already installed Sharp by absolute path. If omitted,
normal `require("sharp")` resolution is used, including an existing `NODE_PATH`.
Missing Sharp is a blocker, not permission to install anything. There is no
Playwright, Chromium, browser payload or alternate renderer.

The ID must exist in projects JSON. Outputs stay under job `assets/cards/src/`:
1000px-wide dark/light JPEGs at quality 80, plus an optional 128px-wide derived
PNG logo. Transparent JPEG inputs flatten onto black. All paths and staged
inputs are preflighted, then all conversions complete in memory before writing.
Sharp replaces browser encoding, so newly prepared raster bytes are not promised
to match historical browser-encoded bytes. Reuse existing prepared assets when
only card text/counts changed.

## Review and delivery

Outputs use exclusive creation: nothing truncates or replaces an existing job
artifact. A conversion or selected-input failure writes nothing. An unexpected
filesystem failure during final writes can leave some newly created files;
the helper does not remove them or silently overwrite them on retry. Use a fresh
authorized dated job rather than deleting existing artifacts.

Deliver only approved, affected finished outputs through the existing delivery
contract. Do not deliver staging copies, fonts, source logos or intermediate
rasters as final assets. Preserve count-free logos, unrelated card themes and
the Claude OG image unless a separate approved change requires them. Review
both selected themes and embedded pixels before publishing assets; no helper
performs that review or automatically publishes anything.
