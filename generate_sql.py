import sys
import os
sys.path.append(os.path.abspath('backend'))

from sqlalchemy.schema import CreateTable, CreateIndex
from proxima.models import Base
from sqlalchemy import create_engine

engine = create_engine('postgresql://postgres:password@localhost/proxima', strategy='mock', executor=lambda sql, *a, **kw: print(sql))

for table in Base.metadata.sorted_tables:
    print(CreateTable(table).compile(engine))
    for index in table.indexes:
        print(CreateIndex(index).compile(engine))
