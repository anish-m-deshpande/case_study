#!/bin/bash
set -e

echo "🚀 Starting Northwind Logistics Expense Review System..."

# Initialize the database
echo "📦 Initializing database..."
python seed_db.py

# Load policies into ChromaDB
echo "📚 Loading policies into vector database..."
python policy_engine.py

# Start the FastAPI backend (which will also serve the frontend)
echo "🌐 Starting web server on port 8000..."
exec python main.py
