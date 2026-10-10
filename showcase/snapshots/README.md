# Reviewed public source snapshots

These five small public records were captured byte-for-byte from the authoritative producer repositories' root `showcase.json` files on **2026-10-10**. They provide explicit consumer inputs where those canonical producer checkouts are unavailable; they are not repository copies or guarantees of latest upstream facts.

| Snapshot | Public producer | Reviewed source HEAD |
|---|---|---|
| `neumanos.json` | `travisjneuman/neumanos` | `96bc86ac155803778967852c56d151acaec23518` |
| `ndev-learn.json` | `travisjneuman/ndev.learn` | `00441d15b657d2ee049fddc4db1b1de83e3f32e3` |
| `learn-python.json` | `travisjneuman/learn.python` | `5d0043730f274a09c596d6aa2b311fed7442f881` |
| `kersten-portfolio.json` | `travisjneuman/ndev.kmn` | `7217b7422dc8f9bff96bda72ab4076316c73ca0e` |
| `plex-real-tv.json` | `travisjneuman/plex-real-tv` | `bdec088bac31f9815f8141ef5b6db278b886aecc` |

Each metric retains its reviewed definition, original code/file anchor, source HEAD, and `asOf` date in the JSON. All metrics are dated **2026-10-10** except NeumanOS **Formula exports**, which remains **390+**, dated **2026-10-05**: historical uppercase package exports, not a freshly measured supported-app formula total. File `updated` is the curation date, not proof that status, deployment, or every metric was reverified.

Use the existing explicit overrides from the profile repository root:

```text
--source-file=neumanos=showcase/snapshots/neumanos.json
--source-file=ndev-learn=showcase/snapshots/ndev-learn.json
--source-file=learn-python=showcase/snapshots/learn-python.json
--source-file=kersten-portfolio=showcase/snapshots/kersten-portfolio.json
--source-file=plex-real-tv=showcase/snapshots/plex-real-tv.json
```

Producer roots remain authoritative. To update these inputs, review the producer facts and recapture the curated root records unchanged; never refresh dates alone or execute commands embedded in metric source text.
