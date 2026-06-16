import os
from cryptography.hazmat.primitives.asymmetric import rsa
from cryptography.hazmat.primitives import serialization

# Generate private key
private_key = rsa.generate_private_key(
    public_exponent=65537,
    key_size=2048,
)

private_pem = private_key.private_bytes(
    encoding=serialization.Encoding.PEM,
    format=serialization.PrivateFormat.PKCS8,
    encryption_algorithm=serialization.NoEncryption()
).decode('utf-8').replace('\n', '\\n')

# Generate public key
public_key = private_key.public_key()
public_pem = public_key.public_bytes(
    encoding=serialization.Encoding.PEM,
    format=serialization.PublicFormat.SubjectPublicKeyInfo
).decode('utf-8').replace('\n', '\\n')

env_content = f"""ENVIRONMENT=development
DATABASE_URL=postgresql+asyncpg://postgres:password@db:5432/proxima
REDIS_URL=redis://redis:6379/0
CELERY_BROKER_URL=redis://redis:6379/1
CELERY_RESULT_BACKEND=redis://redis:6379/2
CORS_ORIGINS=http://localhost:5173
FRONTEND_URL=http://localhost:5173

GOOGLE_CLIENT_ID=dev_google_client_id
GOOGLE_CLIENT_SECRET=dev_google_client_secret
GOOGLE_REDIRECT_URI=http://localhost:8000/api/auth/callback

JWT_ALGORITHM=RS256
ACCESS_TOKEN_EXPIRE_MINUTES=15
REFRESH_TOKEN_EXPIRE_DAYS=7
JWT_PRIVATE_KEY="{private_pem}"
JWT_PUBLIC_KEY="{public_pem}"

GEMINI_API_KEY=dev_gemini_key
OPENAI_API_KEY=
ANTHROPIC_API_KEY=
"""

with open("backend/.env", "w") as f:
    f.write(env_content)
