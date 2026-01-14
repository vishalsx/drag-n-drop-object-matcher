from datetime import datetime
from zoneinfo import ZoneInfo
from typing import Optional


def format_datetime_for_user(
    dt: datetime,
    timezone: Optional[str] = None,
    format_str: str = "%Y-%m-%d %I:%M %p %Z"
) -> str:
    """
    Convert UTC datetime to user's timezone and format for display.
    
    Args:
        dt: UTC datetime object (should be timezone-aware)
        timezone: User's timezone (e.g., "Asia/Kolkata", "America/New_York")
                 If None or invalid, defaults to UTC
        format_str: strftime format string
                   Default: "2025-12-28 07:30 PM IST"
    
    Returns:
        Formatted datetime string in user's timezone
        
    Examples:
        >>> dt = datetime(2025, 12, 28, 14, 0, tzinfo=timezone.utc)
        >>> format_datetime_for_user(dt, "Asia/Kolkata")
        "2025-12-28 07:30 PM IST"
        >>> format_datetime_for_user(dt)
        "2025-12-28 02:00 PM UTC"
    """
    # Ensure datetime is timezone-aware (assume UTC if naive)
    if dt.tzinfo is None:
        from datetime import timezone as tz
        dt = dt.replace(tzinfo=tz.utc)
    
    # If no timezone provided or invalid, use UTC
    if not timezone:
        user_tz = ZoneInfo("UTC")
    else:
        try:
            user_tz = ZoneInfo(timezone)
        except Exception:
            # Invalid timezone, fall back to UTC
            print(f"[DateUtils] Invalid timezone '{timezone}', using UTC")
            user_tz = ZoneInfo("UTC")
    
    # Convert to user's timezone
    local_dt = dt.astimezone(user_tz)
    
    # Format and return
    return local_dt.strftime(format_str)


def get_timezone_abbreviation(timezone: Optional[str] = None) -> str:
    """
    Get the abbreviated timezone name (e.g., "IST", "PST", "UTC").
    
    Args:
        timezone: User's timezone (e.g., "Asia/Kolkata")
    
    Returns:
        Timezone abbreviation string
    """
    if not timezone:
        return "UTC"
    
    try:
        user_tz = ZoneInfo(timezone)
        # Create a datetime to get the proper abbreviation
        now = datetime.now(user_tz)
        return now.strftime("%Z")
    except Exception:
        return "UTC"
