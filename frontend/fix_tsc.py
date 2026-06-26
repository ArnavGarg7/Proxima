import os

files_to_fix = [
    "frontend/src/components/analyze/ActionItemCard.tsx",
    "frontend/src/components/analyze/EntityCard.tsx",
    "frontend/src/components/analyze/TakeawayCard.tsx",
    "frontend/src/components/analyze/TopicCard.tsx",
    "frontend/src/components/dashboard/ActivityTimeline.tsx",
    "frontend/src/components/dashboard/DashboardStatCard.tsx",
    "frontend/src/components/dashboard/RecentRunCard.tsx",
    "frontend/src/components/dashboard/SessionCard.tsx"
]

for file in files_to_fix:
    path = os.path.join("d:/Projects/Proxima", file)
    if os.path.exists(path):
        with open(path, 'r') as f:
            lines = f.readlines()
        with open(path, 'w') as f:
            for line in lines:
                if line.strip() == "import React from 'react';":
                    continue
                f.write(line)

# Fix Dashboard.tsx
dashboard_path = "d:/Projects/Proxima/frontend/src/pages/Dashboard.tsx"
if os.path.exists(dashboard_path):
    with open(dashboard_path, 'r') as f:
        content = f.read()
    content = content.replace("const intervalId: NodeJS.Timeout;", "let intervalId: NodeJS.Timeout;")
    content = content.replace("const handleResume = (id: string, analyzer: string) => {", "const handleResume = (_id: string, analyzer: string) => {")
    with open(dashboard_path, 'w') as f:
        f.write(content)
print("Done")
