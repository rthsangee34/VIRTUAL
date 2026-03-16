# VR Classroom Strategy Game (MVP)

This is a working starter implementation of your spec:

- Teacher dashboard (PC/Laptop): create/manage session, phases, questions, live monitoring
- Student UI (mobile-friendly): join via code, answer questions, view team + leaderboard
- World view: a simple map showing 6 team zones + upgrades
- Real-time multiplayer: Socket.IO

## Requirements

- Node.js 20+ (recommended)
- npm 9+

If `node` is not recognized on your PC, install Node.js LTS first, then reopen your terminal.

## Run

1. Install dependencies:

```powershell
npm install
```

2. Start the server:

```powershell
npm run dev
```

3. Open in your browser:

- Teacher: `http://localhost:3000/teacher.html`
- Student: `http://localhost:3000/student.html`
- World: `http://localhost:3000/world.html`

Teacher UI shows a `Teacher Key` for the session. Keep it private; it’s required to control the session.

## Built-in Question IDs

If you use the built-in question bank, IDs are:

- Phase 1: `p1-1` ... `p1-20`
- Phase 2: `p2-1` ... `p2-40`
- Phase 3: `p3-1` ... `p3-20`
- Phase 4: `p4-1` ... `p4-20`
- Phase 5: `p5-1` ... `p5-20`

Teacher dashboard includes an "Ask Next" button that uses this pattern.

## Saving Results

When the teacher ends a session, the server writes a snapshot JSON into `data/` as `results-<CODE>-<timestamp>.json`.

## Question Bank Format

Teacher can load a JSON array of questions:

```json
[
  {
    "id": "q1",
    "phase": 1,
    "type": "mcq",
    "prompt": "Choose the plural of 'child'.",
    "choices": ["childs", "children", "childes", "childrens"],
    "answer": "children"
  }
]
```

If you do not upload a bank, the server provides a built-in sample bank for all 5 phases.
