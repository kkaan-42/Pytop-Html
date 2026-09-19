import sqlite3
import os

DB_PATH = os.path.join(os.path.dirname(os.path.abspath(__file__)), "app_data.db")

def get_db():
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    return conn

def init_db():
    with get_db() as conn:
        conn.execute("""
            CREATE TABLE IF NOT EXISTS todos (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                title TEXT NOT NULL,
                completed INTEGER NOT NULL DEFAULT 0,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
        """)
        # Varsayılan birkaç örnek not ekleyelim (eğer tablo boşsa)
        cursor = conn.cursor()
        cursor.execute("SELECT COUNT(*) FROM todos")
        if cursor.fetchone()[0] == 0:
            cursor.executemany(
                "INSERT INTO todos (title, completed) VALUES (?, ?)",
                [
                    ("Python ve HTML projesini incele", 1),
                    ("Canlı CPU/RAM grafiğini kontrol et", 0),
                    ("Metin analiz aracını test et", 0)
                ]
            )
            conn.commit()

def get_all_todos():
    with get_db() as conn:
        cursor = conn.cursor()
        cursor.execute("SELECT id, title, completed, created_at FROM todos ORDER BY id DESC")
        rows = cursor.fetchall()
        return [dict(row) for row in rows]

def add_todo(title):
    with get_db() as conn:
        cursor = conn.cursor()
        cursor.execute("INSERT INTO todos (title, completed) VALUES (?, 0)", (title,))
        conn.commit()
        return cursor.lastrowid

def toggle_todo(todo_id):
    with get_db() as conn:
        cursor = conn.cursor()
        cursor.execute("UPDATE todos SET completed = 1 - completed WHERE id = ?", (todo_id,))
        conn.commit()
        return cursor.rowcount > 0

def delete_todo(todo_id):
    with get_db() as conn:
        cursor = conn.cursor()
        cursor.execute("DELETE FROM todos WHERE id = ?", (todo_id,))
        conn.commit()
        return cursor.rowcount > 0
