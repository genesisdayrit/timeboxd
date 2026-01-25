# Releasing Timeboxd

This document describes how to create releases with auto-update support.

## Prerequisites

Before your first release, ensure:
1. Signing keys are generated (`~/.tauri/timeboxd.key` and `~/.tauri/timeboxd.key.pub`)
2. Public key is configured in `src-tauri/tauri.conf.json` under `plugins.updater.pubkey`
3. GitHub secret `TAURI_SIGNING_PRIVATE_KEY` is set (contents of the private key file)

### Generating Signing Keys

```bash
npx tauri signer generate -w ~/.tauri/timeboxd.key
```

## Release Process

### 1. Update Version Numbers

Update the version in **all three files** (must match):
- `package.json` - `"version"` field
- `src-tauri/Cargo.toml` - `version` under `[package]`
- `src-tauri/tauri.conf.json` - `"version"` field

### 2. Commit and Push

```bash
git add package.json src-tauri/Cargo.toml src-tauri/tauri.conf.json
git commit -m "chore: bump version to X.Y.Z"
git push origin main
```

### 3. Create and Push Tag

```bash
git tag vX.Y.Z
git push origin vX.Y.Z
```

The tag **must** start with `v` (e.g., `v0.2.0`).

### 4. Monitor Build

1. Go to [Actions](https://github.com/genesisdayrit/timeboxd/actions)
2. Watch the "Release" workflow
3. Builds run for: macOS (Apple Silicon + Intel), Linux, Windows

### 5. Publish Release

1. Go to [Releases](https://github.com/genesisdayrit/timeboxd/releases)
2. Find the draft release
3. Edit release notes if needed
4. Click "Publish release"

## How Auto-Updates Work

1. On app startup, `UpdateChecker` component calls the Tauri updater API
2. Updater fetches `latest.json` from GitHub releases
3. If a newer version exists, user sees a dialog prompt
4. On confirmation, the update downloads and installs
5. App relaunches with the new version

## Release Artifacts

The workflow produces:
- `.dmg` - macOS installer
- `.AppImage` - Linux portable
- `.msi` - Windows installer
- `.sig` - Signature files for update verification
- `latest.json` - Version manifest for the updater

## Troubleshooting

### Build fails
- Verify `TAURI_SIGNING_PRIVATE_KEY` secret is set correctly
- Check for whitespace issues in the private key

### Update not detected
- Ensure `latest.json` exists in release assets
- Version in app must be lower than released version
- Check endpoint URL in `tauri.conf.json`

### Signature verification fails
- Regenerate keys and update both config and GitHub secret
- Ensure public key in config matches the private key used for signing
