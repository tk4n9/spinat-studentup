#!/usr/bin/env bash
# ── scripts/migrate-storage.sh ────────────────────────────────────────
# One-shot storage layout migration for the unified recording-booth/
# codebase (US-006 of .omc/plans/unify-booths-v2.md).
#
# Idempotent: safe to re-run. Second run reports "already migrated,
# nothing to do" per booth and exits 0 without mutating anything.
#
# Contract:
#   1. Before ANY mutation: snapshot recording-booth/backend/storage/
#      to .backup-$(date +%s).tar.gz (gitignored). No backup when no
#      mutation is needed — avoids tarball spam on re-runs.
#   2. Legacy top-level storage/{display,instagram,temp,music}/ are
#      the pre-unify booth-1 artifact location (from program-a-reels-booth
#      before US-001 renamed it). Move their contents into
#      storage/booth-1/<same>/ and remove the now-empty legacy dirs.
#   3. If booth-2-objects/backend/storage/ still exists (it shouldn't
#      after US-003 git rm -r'd the directory, but US-006 AC #3 requires
#      the script to handle both orderings), migrate its contents into
#      storage/booth-2/. No-op otherwise.
#   4. Ensure storage/booth-{1,2,3}/counter.json exists with
#      '{"counter":0}' if missing. Existing counter.json is preserved
#      bitwise — we never overwrite a booth that already has state.
#   5. Ensure each booth-N/ has a committed .gitkeep so the scaffold
#      tracks while the per-video content stays gitignored.
#
# Usage: bash scripts/migrate-storage.sh

set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
STORAGE="$ROOT/recording-booth/backend/storage"
LEGACY_B2="$ROOT/booth-2-objects/backend/storage"

# Layout convention:
#   storage/
#     booth-1/ { display,instagram,temp,music,counter.json,.gitkeep }
#     booth-2/ { ... }
#     booth-3/ { ... }   # new under unified app; no prior data
# Top-level display/instagram/temp/music are legacy and must not exist
# post-migration.
SUBDIRS=(display instagram temp music)
BOOTHS=(1 2 3 4)

log()  { printf '%s\n' "$*"; }
warn() { printf '\033[33m%s\033[0m\n' "$*" >&2; }
fail() { printf '\033[31m%s\033[0m\n' "$*" >&2; exit 1; }

# ── Detect whether any migration step is still pending ──────────────
needs_migration() {
  # (a) Legacy top-level dirs exist → pending
  for d in "${SUBDIRS[@]}"; do
    [ -d "$STORAGE/$d" ] && return 0
  done
  # (b) booth-2-objects legacy source still present → pending
  [ -d "$LEGACY_B2" ] && return 0
  # (c) Per-booth counter.json or .gitkeep missing → pending
  for n in "${BOOTHS[@]}"; do
    [ -f "$STORAGE/booth-$n/counter.json" ] || return 0
    [ -f "$STORAGE/booth-$n/.gitkeep" ]     || return 0
  done
  return 1
}

if ! needs_migration; then
  log "✓ already migrated, nothing to do (idempotent no-op)."
  exit 0
fi

[ -d "$STORAGE" ] || fail "storage dir missing: $STORAGE"

# ── Backup BEFORE any mutation ──────────────────────────────────────
BACKUP="$STORAGE/.backup-$(date +%s).tar.gz"
log "→ backup: $BACKUP"
# cd so tar stores paths relative to storage/ (not absolute); excluding
# any existing .backup-*.tar.gz prevents nesting on repeated runs in
# edge-case failure scenarios.
tar -czf "$BACKUP" -C "$STORAGE" --exclude='.backup-*.tar.gz' .

# ── Step 2: legacy top-level → booth-1/ ─────────────────────────────
for d in "${SUBDIRS[@]}"; do
  src="$STORAGE/$d"
  dst="$STORAGE/booth-1/$d"
  [ -d "$src" ] || continue
  mkdir -p "$dst"
  # Move every non-dot file + non-dot dir from src into dst. Using
  # find instead of `mv src/* dst/` so empty dirs (our actual state)
  # don't produce a glob error under set -e.
  find "$src" -mindepth 1 -maxdepth 1 ! -name '.*' -exec mv {} "$dst/" \;
  rmdir "$src" 2>/dev/null || warn "  $src not empty after move (contains dotfiles?)"
  log "  moved legacy $d/ → booth-1/$d/"
done

# ── Step 3: booth-2-objects legacy source ──────────────────────────
if [ -d "$LEGACY_B2" ]; then
  log "→ migrating booth-2-objects legacy storage"
  for d in "${SUBDIRS[@]}"; do
    src="$LEGACY_B2/$d"
    dst="$STORAGE/booth-2/$d"
    [ -d "$src" ] || continue
    mkdir -p "$dst"
    find "$src" -mindepth 1 -maxdepth 1 ! -name '.*' -exec mv {} "$dst/" \;
    log "  moved booth-2-objects/$d/ → booth-2/$d/"
  done
  # Preserve counter.json value bitwise if the legacy file had real data.
  if [ -f "$LEGACY_B2/counter.json" ] && [ ! -f "$STORAGE/booth-2/counter.json" ]; then
    mv "$LEGACY_B2/counter.json" "$STORAGE/booth-2/counter.json"
    log "  preserved booth-2 counter.json"
  fi
  # Remove the now-migrated source tree so the next run's
  # needs_migration() sees step 3 as done. Guarded by `rm -rf` on the
  # specific storage/ path only — we do NOT touch the rest of the
  # booth-2-objects/ remnant (build artifacts, node_modules) in this
  # script. Anything outside backend/storage/ is out of US-006 scope.
  rm -rf "$LEGACY_B2"
  log "  removed migrated booth-2-objects/backend/storage tree"
else
  log "→ booth-2-objects/ already removed (US-003) — step 3 no-op."
fi

# ── Step 4: counter.json + .gitkeep per booth ──────────────────────
for n in "${BOOTHS[@]}"; do
  dir="$STORAGE/booth-$n"
  mkdir -p "$dir"
  # Ensure expected subdirs exist (config.py auto-creates them on import
  # but populating here keeps the migration self-contained).
  for d in "${SUBDIRS[@]}"; do
    mkdir -p "$dir/$d"
  done
  if [ ! -f "$dir/counter.json" ]; then
    printf '{"counter": 0}\n' > "$dir/counter.json"
    log "  booth-$n: counter.json initialised"
  fi
  if [ ! -f "$dir/.gitkeep" ]; then
    : > "$dir/.gitkeep"
    log "  booth-$n: .gitkeep added"
  fi
done

log "✓ migration complete. Backup at $BACKUP"
