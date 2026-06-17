#!/usr/bin/env python
"""
Test script to demonstrate customer name validation.
Run from project root: python test_customer_name_validation.py
"""

import re


def validate_customer_name(value):
    """Test validator - mirrors the serializer validation"""
    
    # Check if empty or just whitespace
    if not value or not value.strip():
        return False, "Customer name cannot be empty."
    
    # Check maximum length
    if len(value) > 150:
        return False, "Customer name must not exceed 150 characters."
    
    # Check for numbers (bawal)
    if re.search(r'\d', value):
        return False, "Customer name cannot contain numbers."
    
    # Allow only letters, spaces, hyphens, apostrophes, and periods
    if not re.match(r"^[a-zA-Z\s\-'.]+$", value):
        return False, "Customer name can only contain letters, spaces, hyphens, apostrophes, and periods."
    
    return True, "Valid"


# Test cases
test_cases = [
    # Valid names
    ("Juan Dela Cruz", True),
    ("Maria Reyes", True),
    ("Jose Maria O'Brien", True),
    ("Mary Jane Smith-Rodriguez", True),
    ("Dr. John Doe", True),
    ("Anne-Marie", True),
    ("D'Angelo", True),
    
    # Invalid names (with numbers)
    ("Juan123", False),
    ("Customer1", False),
    ("John 2023", False),
    ("Maria 1st", False),
    
    # Invalid names (special characters)
    ("John@Doe", False),
    ("Maria#Santos", False),
    ("Jose_Garcia", False),
    ("Customer&Co", False),
    
    # Invalid names (empty/whitespace)
    ("", False),
    ("   ", False),
    
    # Valid - will be stripped
    ("  Juan Dela Cruz  ", True),
]

print("=" * 60)
print("CUSTOMER NAME VALIDATION TEST RESULTS")
print("=" * 60)

passed = 0
failed = 0

for name, expected_valid in test_cases:
    is_valid, message = validate_customer_name(name)
    
    if is_valid == expected_valid:
        status = "✓ PASS"
        passed += 1
    else:
        status = "✗ FAIL"
        failed += 1
    
    print(f"\n{status}")
    print(f"  Input: '{name}'")
    print(f"  Expected: {'Valid' if expected_valid else 'Invalid'}")
    print(f"  Result: {message}")

print("\n" + "=" * 60)
print(f"SUMMARY: {passed} passed, {failed} failed out of {len(test_cases)} tests")
print("=" * 60)
