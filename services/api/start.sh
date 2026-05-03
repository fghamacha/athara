#!/bin/bash
set -e

echo "⏳ Running migrations..."
python migrate.py
echo "✅ Migrations done."

echo "🚀 Starting Athara API..."
uvicorn main:app --host 0.0.0.0 --port 8000 --reload
