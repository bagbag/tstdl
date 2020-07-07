#!/bin/bash
set -euo pipefail

projects=(
  "base"
  "client"
  "server"
  "database"
  "mongo"
  "redis"
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
