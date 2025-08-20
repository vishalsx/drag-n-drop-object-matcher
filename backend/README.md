# FastAPI + MongoDB Game API

This project provides an API that fetches random picture documents from MongoDB
to be used by the frontend game service.

## Features
- Connects to MongoDB using `motor`
- Retrieves 6 random pictures from `PublicPictures` collection
- Supports environment variables via `.env`

## Setup

```bash
git clone <repo>
cd drag-n-drop-object-matcher/backend
python -m venv venv
source venv/bin/activate
pip install -r requirements.txt



fastapi-mongo-game/
│── backend/
│   ├── __init__.py
│   ├── main.py
│   ├── models.py
│   ├── database.py
│   └── routers/
│       ├── __init__.py
│       └── pictures.py
│
├── requirements.txt
├── .gitignore
├── .env.example
├── run.sh
└── README.md
