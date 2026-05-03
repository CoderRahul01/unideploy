# UniDeploy CLI Global Distribution Guide

To make the UniDeploy CLI globally available, we use a two-pronged approach: NPM for the JavaScript ecosystem and Homebrew for native OS-level installation.

## 1. NPM Distribution (Standard)

The CLI is already structured as an NPM package in `apps/cli`.

### Publishing Steps:
1.  **Login to NPM:** `npm login`
2.  **Version Bump:** `npm version patch` (or minor/major)
3.  **Publish:** `npm publish --access public`

### User Installation:
Users can run it without permanent installation:
```bash
npx unideploy init
```
Or install it globally:
```bash
npm install -g unideploy
```

---

## 2. Homebrew Distribution (Standalone Binary)

For users who prefer a native binary or don't use Node.js globally.

### Packaging:
We use `pkg` or `bun build --compile` to create standalone binaries for macOS (x64/arm64) and Linux.

```bash
# Example using pkg
npm install -g pkg
pkg . --targets node18-macos-x64,node18-macos-arm64,node18-linux-x64 --out-path ./dist
```

### Homebrew Tap:
1. Create a GitHub repo named `homebrew-tap`.
2. Add a formula `Formula/unideploy.rb`:

```ruby
class Unideploy < Formula
  desc "Security hardening for vibe-coded apps"
  homepage "https://unideploy.in"
  url "https://github.com/unideploy/unideploy/releases/download/v0.1.0/unideploy-macos-arm64.tar.gz"
  sha256 "..." # SHA of the release binary

  def install
    bin.install "unideploy"
  end

  test do
    system "#{bin}/unideploy", "--version"
  end
end
```

### User Installation:
```bash
brew tap unideploy/tap
brew install unideploy
```

---

## 3. Global Availability & Plan Enforcement

While the CLI is globally downloadable via NPM and Homebrew, access to the advanced scanning and auto-fix capabilities is gated by the UniDeploy backend.

### How it works:
1.  **Authentication:** Users run `unideploy init`, which uses Composio to link their GitHub account and generates a UniDeploy API key.
2.  **API Key Verification:** Every command (`scan`, `fix`) sends the API key in the `Authorization` header to our FastAPI backend.
3.  **Subscription Check:** The backend queries **Dodo Payments** (via the user's `clerk_id` or `email`) to check their active subscription tier (Free, Indie, Pro, Team).
4.  **Quota Management:** 
    - **Free Tier:** Limited to 5 scans/month. `POST /api/v1/scan` will return a `402 Payment Required` if the quota is exceeded.
    - **Indie/Pro:** Unlimited scans.
    - **Fixes:** `POST /api/v1/fix` is restricted to paid tiers.
5.  **Global CDN:** By publishing to NPM, the package is automatically distributed across the global NPM mirror network (jsDelivr, UNPKG, etc.), ensuring low latency for `npx unideploy` anywhere in the world.

