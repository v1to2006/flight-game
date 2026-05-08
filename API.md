# Flight Game API.md

## Overview

Backend for a WW2 airplane shooter game.

Stack:

* Flask
* MariaDB
* PyMySQL
* Flask-Login
* Flask-CORS
* Cookie-based sessions

Development backend URL:

```txt
http://127.0.0.1:5000
```

API base:

```txt
/api
```

Main API groups:

```txt
/api/auth
/api/player
/api/game
```

---

## Backend Structure

```txt
backend/
  run.py
  requirements.txt
  app/
    __init__.py
    config.py
    db/connection.py
    auth/routes.py
    auth/service.py
    player/routes.py
    player/service.py
    player/stats.py
    game/routes.py
    game/service.py
```

---

## Environment Variables

```env
SECRET_KEY=your-secret-key
DB_HOST=127.0.0.1
DB_PORT=3307
DB_NAME=your-db-name
DB_USER=your-db-user
DB_PASSWORD=your-db-password
```

Docker maps MariaDB like this:

```yml
ports:
  - "3307:3306"
```

---

## Authentication

The backend uses Flask-Login sessions.

Frontend must use cookies:

```js
fetch(url, {
  credentials: "include"
});
```

Without `credentials: "include"`, protected endpoints return `401`.

---

## Database Overview

Main tables:

```txt
users
players
planes
player_planes
airport
difficulty_levels
campaign_fixed_airports
campaign_country_rules
game_sessions
game_occupied_airports
```

---

## `users`

Stores login accounts.

Important columns:

```txt
id
username
password_hash
created_at
```

Used for:

* register
* login
* current user session

Passwords are hashed with Werkzeug.

---

## `players`

Stores player game profile.

Important columns:

```txt
id
user_id
current_player_plane_id
money
created_at
```

Rules:

* one user has one player profile
* `current_player_plane_id` points to `player_planes.id`
* money is stored here

---

## `planes`

Stores plane types available in the shop.

Important columns:

```txt
id
name
default_hp
default_speed
default_damage
default_firerate
price
```

This table stores base stats only.

Example:

```txt
1 = Starter Fighter
```

---

## `player_planes`

Stores planes owned by a player.

Important columns:

```txt
id
player_id
plane_id
hp_level
speed_level
damage_level
firerate_level
purchased_at
```

Rules:

* each owned plane has its own upgrade levels
* use `playerPlaneId` when selecting/upgrading
* use `planeId` when buying from shop

Example:

```txt
planes.id = plane type
player_planes.id = owned plane instance
```

---

## `airport`

Stores real airport data.

Important columns:

```txt
ident
name
type
iso_country
municipality
latitude_deg
longitude_deg
```

Used for:

* campaign generation
* map airport markers
* airport liberation

Only these airport types are used for random campaign airports:

```txt
small_airport
medium_airport
large_airport
```

---

## `difficulty_levels`

Stores difficulty names.

Expected IDs:

```txt
1 = Easy
2 = Medium
3 = Hard
4 = Miniboss
5 = Boss
```

Rewards:

```txt
Easy     = 250
Medium   = 400
Hard     = 600
Miniboss = 800
Boss     = 1000
```

---

## `campaign_fixed_airports`

Stores airports that always appear in every new game.

Important columns:

```txt
airport_ident
difficulty_id
```

Special airports:

```txt
EFHK = Helsinki
EPKE = Miniboss
EDDB = Berlin Boss
```

---

## `campaign_country_rules`

Controls random airport generation per country.

Important columns:

```txt
iso_country
difficulty_id
min_airports
max_airports
```

Example meaning:

```txt
Pick 2-4 medium airports from Germany.
```

---

## `game_sessions`

Stores campaign runs.

Important columns:

```txt
id
player_id
status
started_at
completed_at
```

Status values:

```txt
active
completed
abandoned
```

Starting a new game abandons old active sessions.

---

## `game_occupied_airports`

Stores occupied airports for one campaign session.

Important columns:

```txt
id
game_session_id
airport_ident
difficulty_id
liberated
liberated_at
```

Rules:

* generated when new game starts
* map uses this table
* liberation updates `liberated = true`

---

## Upgrade System

Valid upgrade stats:

```txt
hp
speed
damage
firerate
```

Max level:

```txt
5
```

Multipliers:

```txt
Level 0 = 1.00x
Level 1 = 1.10x
Level 2 = 1.20x
Level 3 = 1.30x
Level 4 = 1.40x
Level 5 = 1.50x
```

Prices:

```txt
Level 1 = 100
Level 2 = 125
Level 3 = 150
Level 4 = 175
Level 5 = 200
```

Final stat formula:

```txt
final_stat = base_stat * upgrade_multiplier
```

---

# API Endpoints

---

## Auth API

Base path:

```txt
/api/auth
```

---

### Register

```http
POST /api/auth/register
```

Body:

```json
{
  "username": "player1",
  "password": "password123"
}
```

Success:

```json
{
  "message": "User registered successfully"
}
```

Notes:

* username minimum length: 3
* password minimum length: 8
* username is lowercased
* player profile is created automatically
* starter plane is created automatically

---

### Login

```http
POST /api/auth/login
```

Body:

```json
{
  "username": "player1",
  "password": "password123"
}
```

Success:

```json
{
  "message": "Logged in successfully",
  "user": {
    "id": "1",
    "username": "player1"
  }
}
```

---

### Logout

```http
POST /api/auth/logout
```

Success:

```json
{
  "message": "Logged out successfully"
}
```

---

### Current User

```http
GET /api/auth/me
```

Logged in:

```json
{
  "loggedIn": true,
  "user": {
    "id": "1",
    "username": "player1"
  }
}
```

Not logged in:

```json
{
  "loggedIn": false
}
```

---

## Player API

Base path:

```txt
/api/player
```

All endpoints require login.

---

### Get Player Profile

```http
GET /api/player/profile
```

Response:

```json
{
  "player": {
    "id": 1,
    "userId": 1,
    "money": 0,
    "currentPlayerPlaneId": 1
  }
}
```

---

### Get Owned Planes

```http
GET /api/player/planes
```

Returns owned planes with:

```txt
baseStats
upgrades
multipliers
nextUpgradePrices
stats
selected
```

---

### Get Shop Planes

```http
GET /api/player/planes/shop
```

Returns all shop planes and whether player owns them.

Important response fields:

```txt
planeId
name
owned
playerPlaneId
price
baseStats
```

---

### Select Plane

```http
POST /api/player/planes/select
```

Body:

```json
{
  "playerPlaneId": 1
}
```

Success:

```json
{
  "message": "Plane selected",
  "currentPlayerPlaneId": 1
}
```

---

### Buy Plane

```http
POST /api/player/planes/buy
```

Body:

```json
{
  "planeId": 2
}
```

Success:

```json
{
  "message": "Plane purchased",
  "playerPlaneId": 2,
  "planeId": 2,
  "money": 500
}
```

Possible errors:

```txt
Plane not found
Plane already owned
Not enough money
```

---

### Upgrade Plane

```http
POST /api/player/planes/upgrade
```

Body:

```json
{
  "playerPlaneId": 1,
  "stat": "hp"
}
```

Success:

```json
{
  "message": "Plane upgraded",
  "playerPlaneId": 1,
  "stat": "hp",
  "newLevel": 1,
  "newMultiplier": 1.1,
  "upgradePrice": 100,
  "nextUpgradePrice": 125,
  "money": 900
}
```

Possible errors:

```txt
Invalid upgrade stat
Plane not owned by player
Upgrade is already at max level
Not enough money
```

---

## Game API

Base path:

```txt
/api/game
```

All endpoints require login.

---

### Start New Game

```http
POST /api/game/start
```

What it does:

* abandons old active game
* resets player money to 0
* deletes owned planes
* recreates starter plane
* creates new game session
* generates occupied airports

Success:

```json
{
  "message": "New game started",
  "gameSessionId": 1,
  "occupiedAirportsCount": 25,
  "playerReset": {
    "money": 0,
    "currentPlayerPlaneId": 1,
    "starterPlaneId": 1
  }
}
```

---

### Continue Game

```http
GET /api/game/continue
```

Returns active game with all airports, including liberated ones.

Success:

```json
{
  "hasActiveGame": true,
  "gameSessionId": 1,
  "status": "active",
  "progress": {
    "totalAirports": 25,
    "liberatedAirports": 3,
    "remainingAirports": 22
  },
  "airports": []
}
```

No active game:

```json
{
  "hasActiveGame": false,
  "message": "No active game found"
}
```

---

### Get Map

```http
GET /api/game/map
```

Returns only non-liberated occupied airports.

Success:

```json
{
  "hasActiveGame": true,
  "gameSessionId": 1,
  "occupiedAirports": []
}
```

Airport object shape:

```json
{
  "airportIdent": "EFHK",
  "name": "Helsinki Vantaa Airport",
  "type": "large_airport",
  "isoCountry": "FI",
  "municipality": "Helsinki",
  "latitude": 60.3172,
  "longitude": 24.9633,
  "liberated": false,
  "difficulty": {
    "id": 1,
    "name": "Easy"
  }
}
```

---

### Get Status

```http
GET /api/game/status
```

Success:

```json
{
  "hasActiveGame": true,
  "gameSessionId": 1,
  "status": "active",
  "totalAirports": 25,
  "liberatedAirports": 3,
  "remainingAirports": 22
}
```

---

### Liberate Airport

```http
POST /api/game/airports/liberate
```

Body:

```json
{
  "airportIdent": "EFHK"
}
```

Success:

```json
{
  "message": "Airport liberated",
  "airportIdent": "EFHK",
  "remainingAirports": 21,
  "reward": {
    "money": 250
  },
  "gameCompleted": false
}
```

If airport is already liberated:

```json
{
  "message": "Airport liberated",
  "airportIdent": "EFHK",
  "remainingAirports": 21,
  "reward": {
    "money": 0
  },
  "gameCompleted": false
}
```

If miniboss airport `EPKE` is liberated:

```json
{
  "event": {
    "type": "miniboss_defeated",
    "title": "Miniboss defeated",
    "subtitle": "Wolfsschanze neutralized"
  }
}
```

If boss airport `EDDB` is liberated:

```json
{
  "ending": {
    "type": "victory",
    "title": "Victory",
    "subtitle": "Berlin Liberated"
  }
}
```

Possible errors:

```txt
airportIdent is required
No active game found
Airport is not part of the active game
```

---

# Full Endpoint List

## Auth

```txt
POST /api/auth/register
POST /api/auth/login
POST /api/auth/logout
GET  /api/auth/me
```

## Player

```txt
GET  /api/player/profile
GET  /api/player/planes
GET  /api/player/planes/shop
POST /api/player/planes/select
POST /api/player/planes/buy
POST /api/player/planes/upgrade
```

## Game

```txt
POST /api/game/start
GET  /api/game/continue
GET  /api/game/map
GET  /api/game/status
POST /api/game/airports/liberate
```

---

# Important Rules

## `planeId` vs `playerPlaneId`

Use `planeId` when buying from shop.

```json
{
  "planeId": 2
}
```

Use `playerPlaneId` when selecting or upgrading owned planes.

```json
{
  "playerPlaneId": 1
}
```

---

## Starting New Game Resets Player

Starting a new game resets:

```txt
money
owned planes
plane upgrades
selected plane
```

Then it creates the starter plane again.

---

## Game Completion

Game is completed when:

```txt
EDDB is liberated
```

or:

```txt
all occupied airports are liberated
```

---

## Frontend Fetch Reminder

Always use this for protected endpoints:

```js
credentials: "include"
```

Example:

```js
const response = await fetch("http://127.0.0.1:5000/api/player/profile", {
  credentials: "include"
});
```
