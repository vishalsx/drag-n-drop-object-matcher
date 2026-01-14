"""
Database initialization script for contest analytics indexes.

Run this script once to create the necessary indexes for optimal query performance.

Usage:
    python -m app.scripts.init_analytics_indexes
"""

import asyncio
from app.database import contest_analytics_collection


async def create_analytics_indexes():
    """Create indexes for contest_analytics collection"""
    
    print("Creating indexes for contest_analytics collection...")
    
    try:
        # Index 1: Compound index for user queries (user_id + contest_id)
        await contest_analytics_collection.create_index(
            [("user_id", 1), ("contest_id", 1)],
            name="user_contest_idx"
        )
        print("✓ Created index: user_contest_idx")
        
        # Index 2: Contest-wide queries with timestamp sorting
        await contest_analytics_collection.create_index(
            [("contest_id", 1), ("started_at", -1)],
            name="contest_timestamp_idx"
        )
        print("✓ Created index: contest_timestamp_idx")
        
        # Index 3: Unique index for attempt_id lookup
        await contest_analytics_collection.create_index(
            [("attempt_id", 1)],
            unique=True,
            name="attempt_id_unique_idx"
        )
        print("✓ Created index: attempt_id_unique_idx")
        
        # Index 4: Index for round_status filtering
        await contest_analytics_collection.create_index(
            [("round_status", 1)],
            name="round_status_idx"
        )
        print("✓ Created index: round_status_idx")
        
        # Index 5: Index for language-based analytics
        await contest_analytics_collection.create_index(
            [("contest_id", 1), ("language_name", 1)],
            name="contest_language_idx"
        )
        print("✓ Created index: contest_language_idx")
        
        print("\n✅ All indexes created successfully!")
        
        # List all indexes
        print("\nExisting indexes:")
        indexes = await contest_analytics_collection.list_indexes().to_list(length=None)
        for idx in indexes:
            print(f"  - {idx['name']}: {idx.get('key', {})}")
        
    except Exception as e:
        print(f"\n❌ Error creating indexes: {e}")
        raise


if __name__ == "__main__":
    print("=" * 60)
    print("Contest Analytics Database Initialization")
    print("=" * 60)
    print()
    
    asyncio.run(create_analytics_indexes())
    
    print("\n" + "=" * 60)
    print("Initialization complete!")
    print("=" * 60)
