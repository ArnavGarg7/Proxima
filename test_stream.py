import requests
import json

s = requests.Session()
# Login first
res = s.post('http://localhost:8000/api/auth/login', json={'email': 'arnavgargdps@gmail.com', 'password': 'password'})
print("Login status:", res.status_code)

r = s.post('http://localhost:8000/api/intelligence/complete', json={'document_id': 'ae5c3fe5-8564-42f9-8300-2fbf933b992a', 'user_task': 'Analyze this document completely.'}, stream=True)
print('STATUS:', r.status_code)
for line in r.iter_lines():
    if line: print(line.decode('utf-8'))
