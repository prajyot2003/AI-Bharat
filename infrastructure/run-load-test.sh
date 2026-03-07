#!/bin/bash
set -e

# Load environment variables
if [ -f ../.env.local ]; then
  source ../.env.local
fi

# Ensure variables are set
if [ -z "$NEXT_PUBLIC_API_GATEWAY_URL" ] || [ -z "$NEXT_PUBLIC_API_KEY" ]; then
  echo "Error: Required environment variables not set."
  echo "Ensure NEXT_PUBLIC_API_GATEWAY_URL and NEXT_PUBLIC_API_KEY are configured in .env.local"
  exit 1
fi

echo "Starting load test against $NEXT_PUBLIC_API_GATEWAY_URL..."
echo "Target: 100 concurrent users"

# Run Artillery test
export API_URL=$NEXT_PUBLIC_API_GATEWAY_URL
export API_KEY=$NEXT_PUBLIC_API_KEY

npx artillery run load-test.yml -o report.json
npx artillery report report.json

echo "Load test completed! Report generated."
