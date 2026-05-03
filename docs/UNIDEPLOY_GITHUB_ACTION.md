# UniDeploy GitHub Action

The canonical workflow file lives at `.github/workflows/unideploy.yml`.

It expects:

- `UNIDEPLOY_API_KEY` in GitHub repository secrets
- `UNIDEPLOY_DASHBOARD_URL` as an optional repository variable, defaulting to `https://unideploy.in/dashboard`

The workflow runs `unideploy scan --ci --output=json`, writes the JSON report, comments on pull requests with the critical finding count, and fails the job when critical findings are present.
