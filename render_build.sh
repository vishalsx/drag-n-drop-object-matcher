#!/usr/bin/env bash
# exit on error
set -o errexit

echo "------ Starting Build Script ------"

# 1. Build Frontend
echo "--- Building Frontend ---"
cd frontend
npm install
npm run build
cd ..

# 2. Install Backend Dependencies
echo "--- Installing Backend Dependencies ---"
cd backend
pip install -r requirements.txt
cd ..

echo "------ Build Complete ------"
