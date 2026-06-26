import asyncio
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from proxima.database import AsyncSessionLocal
from proxima.models.core import Template
import uuid

async def seed_templates():
    async with AsyncSessionLocal() as db:
        # Check if templates already exist
        result = await db.execute(select(Template))
        existing = result.scalars().all()
        if existing:
            print("Templates already seeded.")
            return

        templates = [
            Template(
                template_id=uuid.uuid4(),
                name="Clinical Note Summary",
                description="Summarize patient encounter, key findings, and treatment plan.",
                domain="clinical",
                content="Please analyze this clinical note and provide a structured summary including:\n1. Chief Complaint\n2. Key Clinical Findings\n3. Diagnoses\n4. Treatment Plan",
                is_public=True
            ),
            Template(
                template_id=uuid.uuid4(),
                name="Contract Risk Audit",
                description="Identify high-risk clauses, indemnification terms, and termination conditions.",
                domain="legal",
                content="Review this contract and extract all high-risk clauses. Focus specifically on:\n- Indemnification and Liability Caps\n- Termination for Convenience\n- Non-Compete / Non-Solicit clauses\n- Auto-renewal terms",
                is_public=True
            ),
            Template(
                template_id=uuid.uuid4(),
                name="Code Review Assistant",
                description="Analyze code for security vulnerabilities, performance bottlenecks, and style guide violations.",
                domain="code",
                content="Perform a comprehensive code review of the following snippet. Highlight:\n1. Security vulnerabilities (OWASP top 10)\n2. Performance bottlenecks\n3. Architectural concerns\n4. Refactoring suggestions",
                is_public=True
            ),
            Template(
                template_id=uuid.uuid4(),
                name="General Document QA",
                description="Extract the main entities, arguments, and actionable takeaways.",
                domain="general",
                content="Analyze this document and extract:\n- Main arguments or thesis\n- Key entities (people, organizations, locations)\n- Action items or takeaways\n- A 3-sentence executive summary",
                is_public=True
            )
        ]
        
        db.add_all(templates)
        await db.commit()
        print(f"Successfully seeded {len(templates)} templates.")

if __name__ == "__main__":
    asyncio.run(seed_templates())
