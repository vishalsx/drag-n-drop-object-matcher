import asyncio
from app.database import languages_collection

async def check():
    langs = await languages_collection.find({}, {"_id": 0}).to_list(length=100)
    print(f"Total languages in DB: {len(langs)}")
    for l in langs:
        print(l)

if __name__ == "__main__":
    asyncio.run(check())
