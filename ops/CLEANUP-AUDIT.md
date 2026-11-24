# Cleanup audit (2026-11-24)

Base: dd86a4aa2ff5204b40a9ea34df2f24344f38d899. No production deployment or user data changes.

- Cache: v11, network-first, 100 entries, 2 MiB runtime item limit, old version cleanup, preview/share-test/ops exclusions. Browser regression testing pending.
- Legacy zero-dive/saved_resource.html, ops/physics.js, ops/rules.js, zero-dive/archive.js and shared.js: retained until complete reference scan succeeds. Tool call limit interrupted full scan.
- Duplicate logos: retained until complete reference scan; existing HTML references confirmed.
- Identity modules: retain both per PROFILE-RECOVERY.md.
- Stats: SPORTS-RANKINGS.md identifies stats-worker.mjs as production entrypoint; test-community.mjs imports stats-worker.js instead. Keep both until production-compatible mock tests are implemented and executed. Do not simply switch import because identity and SQL dependencies differ.
- Preserve preview branches/pages, SQL schemas, licenses, player storage and remote records.
