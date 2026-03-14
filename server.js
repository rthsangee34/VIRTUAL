const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const path = require('path');

const app = express();
const server = http.createServer(app);
const io = new Server(server);

// Serve static files
app.use(express.static(path.join(__dirname, '../public')));

const { saveState, loadState } = require('./firebase-config');

// Data structure to hold game state
let gameState = {
    session: 'ABCD123',
    status: 'waiting', 
    groups: {},
    questionBank: [
        { id: 1, type: 'mcq', Q: 'What is 8 x 8?', options: ['16', '64', '88', '4'], A: '64' },
        { id: 2, type: 'mcq', Q: 'Who invented the Telephone?', options: ['Edison', 'Bell', 'Tesla', 'Newton'], A: 'Bell' },
        { id: 3, type: 'mcq', Q: 'Solve for x: 3x = 15', options: ['3', '5', '15', '12'], A: '5' },
        { id: 4, type: 'mcq', Q: 'What is the capital of France?', options: ['London', 'Berlin', 'Paris', 'Madrid'], A: 'Paris' },
        { id: 5, type: 'mcq', Q: 'What is H2O?', options: ['Oxygen', 'Water', 'Hydrogen', 'Helium'], A: 'Water' },
        { id: 6, type: 'tf', Q: 'The Earth is flat.', options: ['True', 'False'], A: 'False' },
        { id: 7, type: 'mcq', Q: 'What planet is known as the Red Planet?', options: ['Venus', 'Mars', 'Jupiter', 'Saturn'], A: 'Mars' },
        { id: 8, type: 'mcq', Q: 'What is 12 x 12?', options: ['124', '144', '132', '156'], A: '144' },
        { id: 9, type: 'tf', Q: 'Light travels faster than sound.', options: ['True', 'False'], A: 'True' },
        { id: 10, type: 'mcq', Q: 'Who wrote Romeo and Juliet?', options: ['Dickens', 'Shakespeare', 'Twain', 'Austen'], A: 'Shakespeare' },
        { id: 11, type: 'mcq', Q: 'What is the largest ocean?', options: ['Atlantic', 'Indian', 'Pacific', 'Arctic'], A: 'Pacific' },
        { id: 12, type: 'mcq', Q: 'How many continents are there?', options: ['5', '6', '7', '8'], A: '7' },
        { id: 13, type: 'tf', Q: 'The Sun is a star.', options: ['True', 'False'], A: 'True' },
        { id: 14, type: 'mcq', Q: 'What gas do plants absorb?', options: ['Oxygen', 'Nitrogen', 'CO2', 'Helium'], A: 'CO2' },
        { id: 15, type: 'mcq', Q: 'What is 15% of 200?', options: ['15', '20', '25', '30'], A: '30' },
        { id: 16, type: 'mcq', Q: 'Which animal is the largest?', options: ['Elephant', 'Blue Whale', 'Giraffe', 'Shark'], A: 'Blue Whale' },
        { id: 17, type: 'tf', Q: 'Sound can travel through space.', options: ['True', 'False'], A: 'False' },
        { id: 18, type: 'mcq', Q: 'What is the speed of light?', options: ['300 km/s', '300,000 km/s', '30,000 km/s', '3,000 km/s'], A: '300,000 km/s' },
        { id: 19, type: 'mcq', Q: 'Who painted the Mona Lisa?', options: ['Picasso', 'Da Vinci', 'Van Gogh', 'Monet'], A: 'Da Vinci' },
        { id: 20, type: 'mcq', Q: 'What is the square root of 144?', options: ['10', '11', '12', '14'], A: '12' }
    ],
    questionIndex: 0,
    currentQuestion: null,
    feverMode: false,
    feverQuestion: null
};

// Initialization: Load state from Firebase
(async () => {
    const savedState = await loadState();
    if (savedState) {
        gameState = savedState;
    }
})();

// Helper to broadcast and save state
function updateState() {
    io.emit('state-update', gameState);
    saveState(gameState);
}

// Routes
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, '../public/index.html'));
});

app.get('/session/:id', (req, res) => {
    res.sendFile(path.join(__dirname, '../public/index.html'));
});

app.get('/teacher', (req, res) => {
    res.sendFile(path.join(__dirname, '../public/teacher.html'));
});

// Calculate army based on total correct answers
function calculateArmy(correctAnswers) {
    let soldiers = 0;
    if (correctAnswers >= 1) soldiers = 5;
    if (correctAnswers >= 2) soldiers = 10;
    if (correctAnswers >= 3) soldiers = 15;
    if (correctAnswers >= 5) soldiers = 25;
    if (correctAnswers >= 7) soldiers = 35;
    if (correctAnswers >= 10) soldiers = 50;
    return soldiers;
}

function getSpecialUnit(correctAnswers) {
    if (correctAnswers >= 10) return 'Commander';
    if (correctAnswers >= 7) return 'Catapult';
    if (correctAnswers >= 5) return 'Knight';
    if (correctAnswers >= 3) return 'Archer';
    return null;
}

// Socket.IO
io.on('connection', (socket) => {
    console.log('User connected:', socket.id);

    // Send current state on connect
    socket.emit('state-update', gameState);
    socket.emit('your-id', socket.id);

    socket.on('join-session', ({ name, avatar }) => {
        socket.playerName = name;
        socket.playerAvatar = avatar;
        socket.join(gameState.session);
    });

    socket.on('create-group', ({ groupName, flag }) => {
        if (Object.keys(gameState.groups).length >= 6) {
            socket.emit('error-msg', 'Maximum 6 groups allowed!');
            return;
        }
        if (!socket.playerName) {
            socket.emit('error-msg', 'Please enter your name first!');
            return;
        }

        const groupId = 'group_' + Date.now() + '_' + Math.floor(Math.random() * 1000);
        gameState.groups[groupId] = {
            id: groupId,
            name: groupName,
            flag: flag,
            members: [{ id: socket.id, name: socket.playerName, avatar: socket.playerAvatar }],
            castleLevel: 0,
            health: 100,
            soldiers: 0,
            specialUnit: null,
            correctAnswers: 0,
            castleParts: []
        };
        socket.groupId = groupId;
        updateState();
        console.log(`Group "${groupName}" created`);
    });

    socket.on('join-group', (groupId) => {
        if (!gameState.groups[groupId]) {
            socket.emit('error-msg', 'Group does not exist!');
            return;
        }
        if (gameState.groups[groupId].members.length >= 5) {
            socket.emit('error-msg', 'Group is full!');
            return;
        }
        if (!socket.playerName) {
            socket.emit('error-msg', 'Please enter your name first!');
            return;
        }
        if (socket.groupId && gameState.groups[socket.groupId]) {
            socket.emit('error-msg', 'You are already in a group!');
            return;
        }

        gameState.groups[groupId].members.push({ 
            id: socket.id, 
            name: socket.playerName, 
            avatar: socket.playerAvatar 
        });
        socket.groupId = groupId;
        updateState();
    });

    socket.on('answer', ({ questionId, answer }) => {
        const q = gameState.questionBank.find(item => item.id === questionId);
        if (!socket.groupId || !q || !gameState.groups[socket.groupId]) return;

        const group = gameState.groups[socket.groupId];

        if (q.A === answer) {
            group.correctAnswers++;
            let maxLevel = Math.min(group.correctAnswers, 5);
            group.castleLevel = maxLevel;
            const parts = ['Foundation', 'Walls', 'Tower', 'Gate', 'Fortress'];
            group.castleParts = parts.slice(0, maxLevel);
            group.soldiers = calculateArmy(group.correctAnswers);
            group.specialUnit = getSpecialUnit(group.correctAnswers);
            io.emit('correct-answer', { groupId: socket.groupId, level: maxLevel });
        } else {
            if (group.castleLevel > 0) {
                group.castleLevel--;
                group.castleParts.pop();
            }
            group.health = Math.max(0, group.health - 10);
            io.emit('wrong-answer', { groupId: socket.groupId });
        }
        updateState();
    });

    socket.on('next-question', () => {
        if (gameState.questionIndex < gameState.questionBank.length) {
            let nextQ = gameState.questionBank[gameState.questionIndex];
            gameState.questionIndex++;
            gameState.currentQuestion = nextQ;
            io.emit('new-question', nextQ);
            updateState();
        } else {
            socket.emit('error-msg', 'No more questions available!');
        }
    });

    socket.on('start-war', () => {
        gameState.status = 'war';
        io.emit('war-started');
        
        // Start Battle Damage Loop (every 5 seconds)
        const battleInterval = setInterval(() => {
            if (gameState.status !== 'war') {
                clearInterval(battleInterval);
                return;
            }

            let stateChanged = false;
            const groups = Object.values(gameState.groups);
            
            groups.forEach(target => {
                if (target.health <= 0) return;

                // Calculate incoming damage from ALL other teams
                let totalDamage = 0;
                groups.forEach(attacker => {
                    if (attacker.id !== target.id && attacker.health > 0) {
                        // Base damage from soldiers
                        let dmg = attacker.soldiers * 0.1;
                        // Bonus for special units
                        if (attacker.specialUnit === 'Catapult') dmg += 5;
                        if (attacker.specialUnit === 'Commander') dmg *= 1.2;
                        totalDamage += dmg;
                    }
                });

                if (totalDamage > 0) {
                    target.health = Math.max(0, target.health - Math.floor(totalDamage));
                    stateChanged = true;
                    
                    if (target.health <= 0) {
                        io.emit('castle-destroyed', { groupId: target.id, name: target.name });
                    }
                }
            });

            // Check for Winner
            const aliveTeams = groups.filter(g => g.health > 0);
            if (aliveTeams.length === 1 && groups.length > 1) {
                gameState.status = 'finished';
                io.emit('war-winner', { name: aliveTeams[0].name, flag: aliveTeams[0].flag });
                clearInterval(battleInterval);
            }

            if (stateChanged) updateState();

        }, 5000);

        updateState();
    });

    socket.on('trigger-fever', (questionStr) => {
        gameState.feverMode = true;
        gameState.feverQuestion = questionStr;
        io.emit('fever-mode', questionStr);
        updateState();
    });

    socket.on('fever-answer', (answerStr) => {
        if (gameState.feverMode && socket.groupId && gameState.groups[socket.groupId]) {
            gameState.feverMode = false;
            const group = gameState.groups[socket.groupId];
            group.soldiers += 10;
            group.health = Math.min(100, group.health + 20);
            io.emit('fever-winner', { groupId: socket.groupId, name: socket.playerName });
            updateState();
        }
    });

    socket.on('disconnect', () => {
        console.log('User disconnected:', socket.id);
    });
});

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
    console.log(`==============================================`);
    console.log(`  2D Virtual War Learning System`);
    console.log(`  Server running on http://localhost:${PORT}`);
    console.log(`  Teacher: http://localhost:${PORT}/teacher`);
    console.log(`  Students: http://localhost:${PORT}/session/ABCD123`);
    console.log(`==============================================`);
});
