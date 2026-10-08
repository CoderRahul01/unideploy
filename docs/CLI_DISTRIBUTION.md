# UniDeploy CLI Global Distribution Guide

To make the UniDeploy CLI globally available, we use a multi-pronged approach: NPM for the JavaScript/Node ecosystem, native `.dmg` packages for macOS users, and standalone binaries.

---

## 1. NPM Distribution (Primary)

The CLI source code lives in `packages/cli` and is distributed as `unideploy` on npm.

### Publishing to npm:
1. Ensure the workspace builds cleanly:
   ```bash
   npm run build --workspace=packages/cli
   npm run typecheck:cli
   ```
2. Version tag and trigger the GitHub Actions workflow (`.github/workflows/publish-cli.yml`):
   ```bash
   git tag cli/v0.2.5
   git push origin cli/v0.2.5
   ```
3. Or publish directly with an npm authentication token:
   ```bash
   npm publish --workspace=packages/cli --access public
   ```

### User Installation:
Users can run without installation:
```bash
npx unideploy --help
```
Or install globally:
```bash
npm install -g unideploy
```

---

## 2. Native macOS Distribution (`.dmg`)

For macOS developers who prefer a visual dock application:
- Built via Electron and Vite in `apps/desktop`
- Generates `UniDeploy-arm64.dmg` for Apple Silicon (M1/M2/M3/M4)
- Generates `UniDeploy-x64.dmg` for Intel Macs
- Available directly from [unideploy.in/download](https://www.unideploy.in/download)

---

## 3. Global Availability & Token Metering

1. **Authentication**: Users run `unideploy auth`, which uses 6-character device code pairing to link with `unideploy.in/auth`.
2. **Token Verification**: Every execution (`unideploy run`, `unideploy deploy`) sends the stored bearer token to the Cloudflare Worker edge API (`unideploy-api.rahulpandey-creates.workers.dev`).
3. **Plan Tier Enforcement**: The edge API queries Cloudflare D1 to verify remaining compute tokens and active plan tiers (`Free Trial`, `Starter`, `Pro`, `Team`).
4. **Edge CDN Distribution**: By publishing to npm, the package is distributed automatically across the global npm mirror network (jsDelivr, UNPKG, Cloudflare), ensuring ultra-low latency worldwide.
