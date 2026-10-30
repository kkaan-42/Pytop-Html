import os
import shutil
import sqlite3
import sys
from pathlib import Path


def get_data_dir():
    """Keep user data outside the source tree and in the platform's data directory."""
    override = os.environ.get("PYTOP_DATA_DIR")
    if override:
        path = Path(override).expanduser()
    elif os.name == "nt":
        path = Path(os.environ.get("APPDATA", Path.home() / "AppData" / "Roaming")) / "pyTOP Pro"
    elif sys.platform == "darwin":
        path = Path.home() / "Library" / "Application Support" / "pyTOP Pro"
    else:
        path = Path(os.environ.get("XDG_DATA_HOME", Path.home() / ".local" / "share")) / "pytop"
    path.mkdir(parents=True, exist_ok=True)
    return path


DB_PATH = str(get_data_dir() / "app_data.db")
LEGACY_DB_PATH = os.path.join(os.path.dirname(os.path.abspath(__file__)), "app_data.db")
if not os.path.exists(DB_PATH) and os.path.exists(LEGACY_DB_PATH):
    try:
        shutil.copy2(LEGACY_DB_PATH, DB_PATH)
    except OSError:
        pass

def get_db():
    conn = sqlite3.connect(DB_PATH, timeout=5)
    conn.row_factory = sqlite3.Row
    conn.execute("PRAGMA foreign_keys=ON")
    if os.name != "nt":
        try:
            os.chmod(DB_PATH, 0o600)
        except OSError:
            pass
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
