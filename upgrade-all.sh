#!/bin/bash
set -euo pipefail

projects=(
  "base"
  "client"
  "database"
  "server"
  "mongo"
)

for project in "${projects[@]}"; do
  cd "$project"
  ncu -u
  rm -rf node_modules package-lock.json
  npm install
  npm run pub || true
  cd ..
  sleep 5
done
