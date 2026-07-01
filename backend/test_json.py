import json

def clean(response_json):
    if response_json.startswith("```json"):
        response_json = response_json[7:]
    if response_json.startswith("```"):
        response_json = response_json[3:]
    if response_json.endswith("```"):
        response_json = response_json[:-3]
    response_json = response_json.strip()
    return response_json

print(clean("```json\n{\"test\": 1}\n```\n"))
