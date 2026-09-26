# chessss ♟️

A real-time multiplayer chess app built with React, TypeScript, WebSockets, Prisma, and PostgreSQL.

This project is being built in **phases**, each delivered on its own branch and merged via Pull Request:

| Phase | Branch                         | Scope                                                    |
| ----- | ------------------------------ | -------------------------------------------------------- |
| 1     | `phase-1-core-chess-logic`     | Offline local chess board (chess.js + custom theme)      |
| 2     | `phase-2-backend-skeleton`     | Express + WebSocket backend skeleton, `/health` endpoint |
| 3     | `phase-3-realtime-engine`      | Real-time matchmaking & move sync over WebSockets        |
| 4     | `phase-4-database-persistence` | PostgreSQL + Prisma models & persistence                 |
| 5     | `phase-5-authentication`       | Email/password + JWT auth, Google OAuth                  |
| 6     | `phase-6-ui-screens-polish`    | Full screen set, chat, sound effects                     |
| 7     | `phase-7-extras`               | Game history/replay, AI coach, rate limiting, logging    |

## Project structure

```
chessss/
├── frontend/   # React + Vite + TS
└── backend/    # Express + ws + TS
```

## Getting started

See each phase's PR description for setup instructions as features land.
