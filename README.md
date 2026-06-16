# Ai-Researcher-paper-Write-

AI-powered research and academic workflow platform built with Next.js (frontend) and Fastify + MongoDB (backend).

## Overview

This project supports students and lecturers with:

- Research idea generation and literature workflows
- Research paper drafting and structuring
- Citation-aware writing and verification
- Saved research sessions and history
- Lesson planning support for educators

## Tech Stack

- Frontend: Next.js, React, TypeScript
- Backend: Fastify, TypeScript, Mongoose
- Database: MongoDB
- Package managers: npm / pnpm

## Prerequisites

- Node.js `>=20.19.0 <26`
- MongoDB running locally or remotely

## Environment Variables

Copy `.env.example` to `.env` (root and/or `backend/.env`) and fill in required values:

- `OPENROUTER_API_KEY`
- `MONGODB_URI`
- `PORT`
- `FEYNMAN_MODEL`
- `AUTH_SECRET`

Do not commit real secrets.

## Install

```bash
npm install
cd backend && npm install
```

## Run in Development

Start frontend:

```bash
npm run dev
```

Start backend (from repo root):

```bash
npm run dev:backend
```

Default local URLs:

- Frontend: http://localhost:3000
- Backend: http://127.0.0.1:3141

## Build

```bash
npm run build:all
```

## Start Production Build

```bash
npm run start
```

## Notes

- `.env` and `backend/.env` are ignored by git.
- Keep `node_modules`, `.next`, and build artifacts out of commits.