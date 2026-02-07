# SchemaForge

Visual Schema-to-API Platform for Node.js + MongoDB.

Design your data models visually. Generate production-ready Express + Mongoose APIs. Export real code you own.

## What It Does

- **Visual Schema Designer** — Define MongoDB schemas with fields, types, validations, and relationships
- **Auto API Generation** — CRUD endpoints with pagination, filtering, error handling
- **API Explorer** — See all generated endpoints, request/response shapes, query params
- **Code Export** — Download a complete Node.js project (Express + Mongoose) as a ZIP

## Tech Stack

- **Frontend:** React, Tailwind CSS, Vite, React Router, Lucide Icons
- **Backend:** Node.js, Express, MongoDB, Mongoose
- **Code Gen:** Generates standalone Express + Mongoose projects

## Getting Started

### Prerequisites

- Node.js 18+
- MongoDB running locally (or a connection URI)

### Install

```bash
npm run install:all
```

### Configure

```bash
cp server/.env.example server/.env
# Edit server/.env with your MongoDB URI if needed
```

### Run

```bash
npm run dev
```

This starts both the API server (port 3001) and the React dev server (port 5173).

## Project Structure

```
├── server/
│   ├── index.js              # Express entry point
│   ├── config/db.js          # MongoDB connection
│   ├── models/
│   │   ├── Project.js        # Project model
│   │   └── SchemaDefinition.js # Schema definition model
│   ├── routes/
│   │   ├── projects.js       # Project CRUD
│   │   ├── schemas.js        # Schema CRUD + preview
│   │   └── generate.js       # Code generation + ZIP download
│   └── services/
│       └── codeGenerator.js  # Mongoose model + Express route generator
├── client/
│   └── src/
│       ├── pages/
│       │   ├── Dashboard.jsx     # Project list
│       │   ├── ProjectDetail.jsx # Schema list within project
│       │   ├── SchemaEditor.jsx  # Visual schema designer (core)
│       │   ├── ApiExplorer.jsx   # Generated endpoint explorer
│       │   └── CodeExport.jsx    # Code generation + download
│       ├── components/
│       │   ├── Layout.jsx        # App shell + sidebar
│       │   ├── FieldEditor.jsx   # Individual field editor
│       │   └── CodePreview.jsx   # Code block display
│       └── services/
│           └── api.js            # API client
```
