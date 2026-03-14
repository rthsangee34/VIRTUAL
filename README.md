# 🏰 2D Virtual War Learning System

A real-time multiplayer educational classroom strategy game built with Node.js, Express, Socket.IO, HTML5 Canvas via Phaser, and styled with modern Glassmorphism UX.

## 🚀 How to Run

1. Make sure you have **Node.js** installed on your windows machine. If not, go to https://nodejs.org/ and install it.
2. Double-click the **`run_server.bat`** file in this directory. 
3. The script will automatically install dependencies and start the backend server.
4. You will see an output saying `Server running on http://localhost:3000`.

## 🎮 How to Play

### Teacher (Command Center)
- Open `http://localhost:3000/teacher` in your browser.
- Here you can see every group's data (castles, hp, levels, army soldiers). 
- **Send Questions** to test all groups.
- **Trigger Fever Mode** to blast an open question where the fastest to answer gets bonus HP and soldiers.
- **Start War** to begin the battlefield simulation.

### Students (Barracks & Battlefield)
- Students open `http://localhost:3000/session/ABCD123` on their devices.
- They choose an Avatar and Username.
- They can create a new team and pick a Clan Flag (e.g. 🐉 Dragon, 🦁 Lion) or join an existing team.
- Once joined, they will see their faction stats in real-time. Wait for Teacher's signal.
- The Phaser game board will display 6 separate faction plots and generate visually breathing simulated armies per answer.

## 🧪 Future Integrations
- For persisting data across days, link to Firebase by modifying `server/server.js` `gameState` logic using Firebase Admin SDK.
- Further refine Phaser UI assets (sprites) in `public/assets/` to replace the geometric shape simulation generated for demo purposes.
