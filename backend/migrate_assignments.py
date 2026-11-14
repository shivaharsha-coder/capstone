import sqlite3
import os

db_path = os.path.join(os.path.dirname(__file__), 'smart_classroom.db')
conn = sqlite3.connect(db_path)
c = conn.cursor()

def add_col(table, col, col_type):
    try:
        c.execute(f"ALTER TABLE {table} ADD COLUMN {col} {col_type}")
        print(f"Added {col} to {table}")
    except Exception as e:
        print(f"Notice {table}.{col}: {e}")

add_col('assignments', 'submission_format', "VARCHAR(50) DEFAULT 'CODE_AND_WORD'")
add_col('submissions', 'code_file_url', "VARCHAR(500)")
add_col('submissions', 'code_file_name', "VARCHAR(255)")
add_col('submissions', 'doc_file_url', "VARCHAR(500)")
add_col('submissions', 'doc_file_name', "VARCHAR(255)")

# Also update existing assignments to CODE_AND_WORD if NULL
c.execute("UPDATE assignments SET submission_format = 'CODE_AND_WORD' WHERE submission_format IS NULL")

conn.commit()
conn.close()
print("Migration completed successfully!")

