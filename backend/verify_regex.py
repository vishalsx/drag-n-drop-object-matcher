import re
from typing import List, Optional, Any

def simulate_filter_construction(
    language: Optional[str] = None,
    org_id: Optional[str] = None,
    category: Optional[str] = None,
    field_of_study: Optional[str] = None,
    areas_of_interest: Optional[List[str]] = None
):
    """
    Simulates the object_filter construction logic from _get_valid_object_ids.
    """
    object_filter = {"image_status": "Approved"}

    if org_id:
        object_filter["$or"] = [
            {"org_id": org_id},
            {"org_id": {"$exists": False}},
            {"org_id": None},
            {"org_id": ""},
        ]
    else:
        object_filter["$or"] = [
            {"org_id": {"$exists": False}},
            {"org_id": None},
            {"org_id": ""},
        ]

    if category:
        object_filter["metadata.object_category"] = category
    elif field_of_study:
        object_filter["metadata.field_of_study"] = field_of_study
    
    if areas_of_interest:
        def simple_stem(word):
            word = word.lower().strip()
            if not word: return word
            if word.endswith('ies') and len(word) > 4: return word[:-3] + 'i'
            if word.endswith('es') and len(word) > 4: return word[:-2]
            if word.endswith('s') and len(word) > 3: return word[:-1]
            return word

        stems = {simple_stem(interest) for interest in areas_of_interest if interest}
        escaped_stems = [re.escape(stem) for stem in stems if stem]
        if escaped_stems:
            pattern = "|".join(escaped_stems)
            object_filter["embedding_text"] = {"$regex": pattern, "$options": "i"}
            
    return object_filter

def test_matching():
    # User inputs
    areas_of_interest = ["Flowers", "botany"]
    org_id = "MY-ORG-001"
    
    # Simulate filter
    obj_filter = simulate_filter_construction(org_id=org_id, areas_of_interest=areas_of_interest)
    
    print(f"Constructed Filter: {obj_filter}")
    
    # Test cases for embedding_text
    test_texts = [
        "A beautiful red flower",
        "Many Flowers in the garden",
        "Botany research",
        "Animal kingdom"
    ]
    
    regex_pattern = obj_filter["embedding_text"]["$regex"]
    options = obj_filter["embedding_text"]["$options"]
    
    flags = re.IGNORECASE if "i" in options else 0
    
    print(f"\nTesting regex pattern: '{regex_pattern}' with options: '{options}'\n")
    
    for text in test_texts:
        match = re.search(regex_pattern, text, flags)
        print(f"Text: '{text[:50]}...' -> Match Found: {bool(match)}")

if __name__ == "__main__":
    test_matching()
