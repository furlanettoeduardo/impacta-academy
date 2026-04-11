#!/bin/sh
set -e

max_attempts=10
attempt=1

until npx prisma migrate deploy; do
  if [ "$attempt" -ge "$max_attempts" ]; then
    echo "Prisma migrate failed after $max_attempts attempts."
    exit 1
  fi
  echo "Prisma migrate failed, retrying in 3s... ($attempt/$max_attempts)"
  attempt=$((attempt + 1))
  sleep 3
done

npx prisma generate

npm run start:prod
