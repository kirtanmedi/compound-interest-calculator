#!/usr/bin/env bash
# Deletes everything `npm run deploy` created: empties the bucket, then deletes the stack
# (bucket, CloudFront distribution, access control and bucket policy).
#
# Env vars (all optional): STACK_NAME, AWS_REGION, AWS_PROFILE. Pass --yes to skip the prompt.
set -euo pipefail

STACK_NAME="${STACK_NAME:-compound-interest-calculator}"
REGION="${AWS_REGION:-${AWS_DEFAULT_REGION:-us-east-1}}"

if ! aws cloudformation describe-stacks --region "$REGION" --stack-name "$STACK_NAME" >/dev/null 2>&1; then
  echo "Stack ${STACK_NAME} not found in ${REGION}; nothing to delete."
  exit 0
fi

if [[ "${1:-}" != "--yes" ]]; then
  read -r -p "Delete stack ${STACK_NAME} in ${REGION} and all of its files? [y/N] " answer
  [[ "$answer" =~ ^[Yy]$ ]] || { echo "Aborted."; exit 1; }
fi

BUCKET="$(aws cloudformation describe-stacks --region "$REGION" --stack-name "$STACK_NAME" \
  --query "Stacks[0].Outputs[?OutputKey=='BucketName'].OutputValue" --output text)"

if [[ -n "$BUCKET" && "$BUCKET" != "None" ]]; then
  echo "→ Emptying s3://${BUCKET}"
  aws s3 rm "s3://${BUCKET}" --recursive --region "$REGION" --only-show-errors
fi

echo "→ Deleting stack ${STACK_NAME} (CloudFront takes ~5-15 minutes to tear down)"
aws cloudformation delete-stack --region "$REGION" --stack-name "$STACK_NAME"
aws cloudformation wait stack-delete-complete --region "$REGION" --stack-name "$STACK_NAME"
echo "✓ Everything deleted"
