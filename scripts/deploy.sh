#!/usr/bin/env bash
# Creates/updates the S3 + CloudFront stack, builds the app, uploads it and refreshes the CDN.
#
# Env vars (all optional):
#   STACK_NAME      CloudFormation stack name   (default: compound-interest-calculator)
#   AWS_REGION      Region for the bucket/stack (default: us-east-1)
#   AWS_PROFILE     AWS CLI profile to use
#   DOMAIN_NAME     Custom domain, e.g. calc.example.com
#   CERTIFICATE_ARN ACM cert for DOMAIN_NAME (must be in us-east-1)
set -euo pipefail

STACK_NAME="${STACK_NAME:-compound-interest-calculator}"
REGION="${AWS_REGION:-${AWS_DEFAULT_REGION:-us-east-1}}"

cd "$(dirname "$0")/.."

if ! command -v aws >/dev/null 2>&1; then
  echo "AWS CLI not found. Install it (https://aws.amazon.com/cli/) and run 'aws configure'." >&2
  exit 1
fi

params=()
if [[ -n "${DOMAIN_NAME:-}" ]]; then
  if [[ -z "${CERTIFICATE_ARN:-}" ]]; then
    echo "DOMAIN_NAME is set but CERTIFICATE_ARN is not (it must be an ACM cert in us-east-1)." >&2
    exit 1
  fi
  params=(--parameter-overrides "DomainName=${DOMAIN_NAME}" "CertificateArn=${CERTIFICATE_ARN}")
fi

echo "→ Deploying stack ${STACK_NAME} in ${REGION} (first run takes a few minutes while CloudFront provisions)"
aws cloudformation deploy \
  --region "$REGION" \
  --stack-name "$STACK_NAME" \
  --template-file infra/template.yaml \
  --no-fail-on-empty-changeset \
  ${params[@]+"${params[@]}"}

output() {
  aws cloudformation describe-stacks --region "$REGION" --stack-name "$STACK_NAME" \
    --query "Stacks[0].Outputs[?OutputKey=='$1'].OutputValue" --output text
}
BUCKET="$(output BucketName)"
DISTRIBUTION="$(output DistributionId)"
SITE_URL="$(output SiteUrl)"

echo "→ Building"
npm run build

echo "→ Uploading to s3://${BUCKET}"
# Hashed assets never change, so cache them forever. Old ones are kept so a cached
# index.html never points at a missing file.
aws s3 sync dist/assets "s3://${BUCKET}/assets" --region "$REGION" \
  --cache-control "public, max-age=31536000, immutable"
# index.html is always revalidated so new deploys show up immediately.
aws s3 cp dist/index.html "s3://${BUCKET}/index.html" --region "$REGION" \
  --cache-control "no-cache" --content-type "text/html; charset=utf-8"

echo "→ Invalidating CloudFront cache"
aws cloudfront create-invalidation --distribution-id "$DISTRIBUTION" --paths "/*" >/dev/null

echo "✓ Live at ${SITE_URL}"
