# compound-interest-calculator

A fast, dark, dashboard-style compound interest calculator. Everything runs in the browser, so it's hosted as a static site on S3 + CloudFront for effectively $0.

## Features

- **Recurring contributions**: weekly to yearly deposits, made at the start or end of each period, with an optional yearly raise.
- **Any compounding frequency**: daily through continuous, with the effective annual yield (APY) shown.
- **Inflation-adjusted view**: switch every number to today's dollars. Real contributions are deflated at the time each deposit is made, so a rate below inflation correctly shows a real loss.
- **Scenario comparison**: up to 3 scenarios overlaid on one chart, with deltas against Scenario A. A new scenario starts as a copy of the current one.
- **Goal solver**: for a target balance, solves for the contribution, initial deposit, rate or time needed, with one click to apply the answer.
- **Shareable URLs**: every input is synced to the query string (defaults are omitted), so a link reproduces the exact setup.
- Year-by-year table with CSV export. Inputs accept shorthand like `25k` or `1.5m`, and arrow keys step values (hold Shift for ×10). The chart can be read with the keyboard (←/→, Home/End).

## Development

Requires Node 16.17+.

```sh
npm install
npm run dev      # http://localhost:5173
npm test         # engine, solver, URL-state and formatting tests
npm run build    # type-check + production build to dist/
```

Code layout:

| Path | What |
|---|---|
| `src/lib/engine.ts` | Period-by-period simulation (pure, framework-free) |
| `src/lib/solver.ts` | Goal solver (closed form for amounts, bisection for rate, scan for time) |
| `src/lib/state.ts` | App state + URL encode/decode |
| `src/components/` | React UI; the chart is hand-rolled SVG (no chart library) |
| `infra/template.yaml` | CloudFormation: private S3 bucket + CloudFront (OAC) |
| `scripts/deploy.sh` | Deploy stack, build, upload, invalidate |

**Math note:** when compounding and contribution frequencies differ, interest is applied each contribution period at the rate equivalent to the effective annual rate. When the two frequencies match, the results equal the textbook formulas exactly (the tests check this against the closed-form annuity formulas).

## Deploying to AWS

Prerequisites: the [AWS CLI](https://aws.amazon.com/cli/) with credentials configured (`aws configure`).

```sh
npm run deploy
```

On the first run this creates the CloudFormation stack, which takes about 3–5 minutes while CloudFront provisions. Later runs only rebuild, upload and invalidate the cache. The script prints the live URL at the end.

Optional env vars: `STACK_NAME`, `AWS_REGION` (default `us-east-1`), `AWS_PROFILE`.

### Custom domain

1. Request an ACM certificate for the domain **in us-east-1** (a CloudFront requirement) and validate it.
2. `DOMAIN_NAME=calc.example.com CERTIFICATE_ARN=arn:aws:acm:us-east-1:…:certificate/… npm run deploy`
3. Point DNS at the `CloudFrontDomain` stack output (a CNAME, or a Route 53 alias record).

### Cost

At personal or small-team traffic this sits inside CloudFront's free tier, and S3 storage is well under 1 MB. Caching is set up to keep it that way: hashed assets are cached for a year, `index.html` is revalidated on each load, and query strings are excluded from the cache key so every shared scenario link hits the same cached page. `PriceClass_100` (North America and Europe edges) keeps the per-request price at the lowest tier.

### Cost alert

`infra/budget.yaml` is a free, account-wide AWS Budget that emails you when spend is forecast to go over, or actually goes over, a monthly limit (default $1, measured before credits). It's a separate stack, so `npm run destroy` leaves it in place.

```sh
aws cloudformation deploy --region us-east-1 --stack-name account-cost-alert \
  --template-file infra/budget.yaml --parameter-overrides AlertEmail=you@example.com
```

Remove it with `aws cloudformation delete-stack --region us-east-1 --stack-name account-cost-alert`.

### Teardown

```sh
npm run destroy
```

This empties the bucket and deletes the whole stack (bucket, CloudFront distribution, access control and bucket policy), leaving nothing behind. CloudFront takes about 5–15 minutes to delete.
