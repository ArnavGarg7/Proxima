import re

temp_path = "backend/alembic/versions/2026_06_16_1121-cffe501729fe_temp.py"
bak_path = "backend/alembic/versions/001_initial_schema.py.bak"
out_path = "backend/alembic/versions/001_initial_schema.py"

with open(temp_path, "r", encoding="utf-8") as f:
    temp_content = f.read()

with open(bak_path, "r", encoding="utf-8") as f:
    bak_content = f.read()

# Extract the imports we need from temp
imports = "from sqlalchemy.dialects import postgresql\nimport pgvector.sqlalchemy.vector\n"

# Extract upgrade body
upgrade_match = re.search(r"def upgrade\(\) -> None:\n(.*?)\ndef downgrade", temp_content, re.DOTALL)
upgrade_body = upgrade_match.group(1)

# Extract downgrade body
downgrade_match = re.search(r"def downgrade\(\) -> None:\n(.*)", temp_content, re.DOTALL)
downgrade_body = downgrade_match.group(1)

# Build the final file
header = """\"\"\"initial_schema

Revision ID: 001_initial_schema
Revises: 
Create Date: 2026-06-16 10:00:00.000000

\"\"\"
from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql
import pgvector.sqlalchemy.vector

# revision identifiers, used by Alembic.
revision = '001_initial_schema'
down_revision = None
branch_labels = None
depends_on = None

def upgrade() -> None:
    # 1. Manually add pgvector extension
    op.execute('CREATE EXTENSION IF NOT EXISTS vector;')

    # 2. Create all tables first programmatically
"""

footer_upgrade = """
    # 3. Execute registered_models seed SQL only after all table creation statements complete
    op.execute(\"\"\"
    INSERT INTO registered_models (model_id, provider, model_type, context_window, is_active)
    VALUES 
        ('gemini-2.5-pro', 'google', 'generation', 2000000, true),
        ('gemini-2.5-flash', 'google', 'generation', 1000000, true),
        ('o1', 'openai', 'generation', 200000, true),
        ('o3-mini', 'openai', 'generation', 200000, true),
        ('claude-3.5-sonnet', 'anthropic', 'generation', 200000, true)
    ON CONFLICT (model_id) DO NOTHING;
    \"\"\")
"""

footer_downgrade = """
    # 4. Ensure downgrade removes seeded data safely by relying on table drops
    op.execute('DROP EXTENSION IF EXISTS vector;')
"""

final_content = header + upgrade_body + footer_upgrade + "\ndef downgrade() -> None:\n" + downgrade_body + footer_downgrade

with open(out_path, "w", encoding="utf-8") as f:
    f.write(final_content)

print("Merged successfully!")
