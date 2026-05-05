# Flight Game

Metropolia school project.

Flight Game is a simple WW2-themed browser game where the player controls a plane and shoots enemy aircraft.

## How to run

### 1. Start the database

Make sure Docker Desktop is running, then run:

```bash
docker compose up -d
```

### 2. Create backend `.env`

Create this file:

```txt
backend/.env
```

Add this:

```env
SECRET_KEY=dev-secret-key
DB_HOST=127.0.0.1
DB_PORT=3307
DB_NAME=your-db-name
DB_USER=your-db-user
DB_PASSWORD=your-db-password
```

Change `DB_NAME`, `DB_USER`, and `DB_PASSWORD` to match your database settings.

### 3. Install and run backend

```bash
cd backend
pip install -r requirements.txt
python run.py
```

Backend runs here:

```txt
http://127.0.0.1:5000
```

### 4. Run frontend

Open another terminal and run:

```bash
cd frontend
python -m http.server 5500
```

Then open:

```txt
http://127.0.0.1:5500
```

You can also run the frontend with VS Code Live Server, JetBrains built-in server, or any other local static server. Just make sure it runs on port `5500`.