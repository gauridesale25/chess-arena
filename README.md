# ♟️ Chess.in

A real-time multiplayer chess game built with **React**, **TypeScript**, **WebSockets**, **Prisma**, and **PostgreSQL**, featuring an AI-powered chess coach powered by **Google Gemini** and **xAI Grok**.

Play against another player online with real-time move synchronization, in-game chat, timed matches, and review your games with a Grandmaster AI coach.

---

## Features

- **Real-Time Multiplayer**: Timed chess matches (5-minute clocks by default) with real-time synchronization via WebSockets.
- **Garry AI Grandmaster Coach**: On-demand position evaluation and tactical advice powered by **Google Gemini 2.5 Flash** or **xAI Grok Beta**.
- **Interactive API Settings**: Save your personal Google Gemini or Grok API keys directly in the browser's `localStorage` to bypass server rate limits.
- **Game History & Review Replay**: 
  - Browse your paginated game history showing opponent names, outcomes (Win/Loss/Draw), sides played, and move counts.
  - Replay completed games move-by-move using navigation controls (Start, Previous, Play/Pause with custom speeds, Next, End).
  - On-demand coach analysis for any board position during replay.
  - Manual board flipping for thorough analysis from both perspectives.
- **Automatic Board Orientation**: The board automatically flips to show your perspective based on your assigned side (White or Black).
- **User Authentication**: Secure registration/login using Email/Password (hashed via bcrypt) or Google OAuth 2.0.
- **Robust Connection Handling**: Reconnection grace period (30 seconds) for disconnected players before forfeiting, and heartbeat pings to maintain socket health.
- **Chess Academy (Learn)**: Preview coming-soon interactive learning modules, customized ELO drills, and join the academy waitlist via email subscription.
- **Sleek Grayscale UI Theme**: A professional glassmorphism interface styled with HSL colors, smooth micro-animations, and slate board styling.
- **Audio Feedback**: Built-in move sound effects for realistic gameplay feel.

*Note: Online gameplay requires a registered/logged-in user account (Guest play has been removed).*

---

## Tech Stack

| Layer | Technologies Used |
|---|---|
| **Frontend** | React 19, TypeScript, Vite, Tailwind CSS v4, Axios, React Router 7 |
| **Backend** | Node.js, Express 5, WebSocket (`ws`), TypeScript |
| **Database** | PostgreSQL, Prisma ORM |
| **Authentication** | JWT (Sessions), Google OAuth 2.0, bcrypt |
| **Game Logic** | `chess.js` (client-side render + server-side validation) |
| **AI Integration** | Google Generative AI SDK (`gemini-2.5-flash`), xAI Grok API (`grok-beta`) |

---

## Project Structure

```
Chess/
├── frontend/             # React + Vite client app (port 5173)
│   └── src/
│       ├── components/   # ChessBoard, SideBar, LoginSidebar, Button, Input
│       ├── context/      # AuthContext (sessions), SocketContext (WS connection)
│       ├── hooks/        # useSockets (access WS connection)
│       ├── screens/      # Landing, Home, Game, Login, SignUp, Email, Learn, Review
│       ├── utils/        # sound.ts (audio helpers)
│       ├── App.tsx       # Client routing
│       └── main.tsx      # Entrypoint & Google OAuth setup
├── backend1/             # Express + WebSockets server (port 3000 by default)
│   ├── prisma/           # Prisma schema (User, Game, Move models) & migrations
│   └── src/
│       ├── controllers/  # auth.controller, coach.controller, game.controller
│       ├── middlewares/  # auth.middleware, errorhandler, rateLimiter
│       ├── routes/       # auth.route, coach.route, game.route
│       ├── utils/        # env config, logger (pino), prisma client
│       ├── Game.ts       # Active game instance logic, move validation, timers
│       ├── GameManager.ts# Matchmaking, player routing, socket heartbeat & lifecycle
│       ├── index.ts      # HTTP and WebSocket server entry point (unified server)
│       └── app.ts        # Express application configuration & health checks
└── package.json          # Monorepo task helper scripts
```

---

## Prerequisites

- **Node.js** v18+ (v20+ recommended)
- **PostgreSQL** running locally or hosted remotely (e.g., [Neon](https://neon.tech) / [Supabase](https://supabase.com))
- **npm** package manager

---

## Setup & Run Locally

### 1. Clone the repository

```bash
git clone https://github.com/Harsh16gupta/Chess.git
cd Chess
```

### 2. Install all dependencies
Run the following script from the project root to install dependencies in both the `frontend` and `backend1` directories:

```bash
npm run install:all
```

### 3. Setup the Backend
Navigate to the `backend1` directory:

```bash
cd backend1
```

Create a `.env` file in the `backend1` directory:

```env
DATABASE_URL="postgresql://username:password@localhost:5432/chess"
JWT_SECRET="your-secret-key-here-must-be-10-or-more-chars"
PORT=3000
CORS_ORIGIN="http://localhost:5173"
NODE_ENV="development"

# Optional: Add server-side API keys for Garry AI Coach
GEMINI_API_KEY="your-gemini-api-key"
GROK_API_KEY="your-grok-api-key"
```

> Replace `username`, `password`, and database details with your actual PostgreSQL credentials.

Apply database schema and generate Prisma Client:

```bash
npx prisma migrate dev --name init
```

Start the server:

```bash
npm run dev
```

The unified backend will start:
- **Express API**: `http://localhost:3000`
- **WebSocket Server**: `ws://localhost:3000/ws`
- **Health Check Endpoint**: `http://localhost:3000/health`

### 4. Setup the Frontend
Open a **new terminal** and run:

```bash
cd frontend
npm run dev
```

This starts the Vite dev server on **`http://localhost:5173`**.

### 5. Play
Open **`http://localhost:5173`** in your browser. To test local matchmaking, open it in two separate browser tabs/windows:
1. Log in or sign up with different accounts on each window (or use Google Auth).
2. Click **Play** on both pages.
3. The server matches the players, determines colors (White/Black), flips the board automatically for the Black player, and the game begins!

---

## Environment Variables Configuration

### Backend (`backend1/.env`)

| Variable | Required/Optional | Description | Default |
|----------|---|---|---|
| `DATABASE_URL` | Required | PostgreSQL connection string | - |
| `JWT_SECRET` | Required | Secret key for signing session tokens (min 10 chars) | - |
| `PORT` | Optional | Port on which the unified server runs | `3000` |
| `CORS_ORIGIN` | Optional | Allowed CORS origin for the frontend | `http://localhost:5173` |
| `NODE_ENV` | Optional | Running environment (`development` / `production` / `test`) | `development` |
| `GEMINI_API_KEY` | Optional | Server-side API key for Google Gemini AI Coach | - |
| `GROK_API_KEY` | Optional | Server-side API key for xAI Grok AI Coach | - |

### Frontend
Vite accesses configuration values via `.env` files or system environment variables:
- `VITE_API_URL`: Points to the backend API (`http://localhost:3000` by default).
- `VITE_WS_URL`: Points to the WebSocket server (`ws://localhost:3000/ws` by default).

---

## Future Improvements

- [ ] Matchmaking system with ELO rating matching (currently simple FIFO queue)
- [ ] Drag-and-drop piece movement (currently tap-to-move)
- [ ] Game persistence (saving active state to resume after disconnection)
- [ ] Spectator mode
- [ ] Fully responsive mobile layout
