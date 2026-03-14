// ============================================
// APP.JS — Main client logic
// ============================================

const socket = io();

// Store our own socket id (sent by server)
let mySocketId = null;

const myState = {
    name: '',
    avatar: '',
    groupId: null
};

// Wait for server to tell us our ID
socket.on('your-id', (id) => {
    mySocketId = id;
    console.log('My socket ID:', mySocketId);
});

// ============ DOM Elements ============
const authBox = document.getElementById('auth-box');
const groupBox = document.getElementById('group-box');
const setupScreen = document.getElementById('setup-screen');
const gameScreen = document.getElementById('game-screen');
const groupListEl = document.getElementById('existing-groups');
const gotoBtn = document.getElementById('goto-board-btn');
const createSection = document.getElementById('create-group-section');

const myTeamInfo = document.getElementById('myTeamInfo');
const myHealthInfo = document.getElementById('myHealthInfo');
const myArmyInfo = document.getElementById('myArmyInfo');
const myCastleInfo = document.getElementById('myCastleInfo');

// ============ Event Listeners ============
document.getElementById('login-btn').addEventListener('click', () => {
    const name = document.getElementById('playerName').value.trim();
    const avatar = document.getElementById('playerAvatar').value;
    if (!name) {
        alert('Please enter your name!');
        return;
    }
    myState.name = name;
    myState.avatar = avatar;
    socket.emit('join-session', { name, avatar });
    
    authBox.classList.add('hidden');
    groupBox.classList.remove('hidden');
});

document.getElementById('preview-map-link').addEventListener('click', (e) => {
    e.preventDefault();
    goToBoard();
});

document.getElementById('create-group-btn').addEventListener('click', () => {
    const groupName = document.getElementById('groupName').value.trim();
    const flag = document.getElementById('groupFlag').value;
    if (!groupName) {
        alert('Please enter a group name!');
        return;
    }
    socket.emit('create-group', { groupName, flag });
});

gotoBtn.addEventListener('click', () => {
    goToBoard();
});

document.getElementById('fever-submit-btn').addEventListener('click', () => {
    const ans = document.getElementById('fq-answer').value.trim();
    if (ans) {
        socket.emit('fever-answer', ans);
        document.getElementById('fever-panel').classList.add('hidden');
        document.getElementById('fq-answer').value = '';
    }
});

// ============ Functions ============
function goToBoard() {
    setupScreen.classList.add('hidden');
    gameScreen.classList.remove('hidden');
    
    // Initialize Phaser game only when entering battlefield
    if (!window.gameInstance && typeof initPhaserGame === 'function') {
        initPhaserGame();
    }
}

// Called from group list buttons
window.joinGroup = function(groupId) {
    socket.emit('join-group', groupId);
};

// ============ Socket Events ============
socket.on('state-update', (state) => {
    // Forward to Phaser scene if active
    if (window.updateGameState) {
        window.updateGameState(state);
    }
    
    // Determine if player is in a group
    let inGroup = false;
    let myGroup = null;
    
    if (groupListEl) {
        groupListEl.innerHTML = '';
    }
    
    for (const key in state.groups) {
        const group = state.groups[key];
        const isMember = group.members.some(m => m.id === mySocketId);
        
        if (isMember) {
            inGroup = true;
            myState.groupId = group.id;
            myGroup = group;
        }

        if (groupListEl) {
            const div = document.createElement('div');
            div.className = 'group-item';
            
            let actionHtml = '';
            if (isMember) {
                actionHtml = '<span style="color:var(--success); font-weight: 600;">✓ Joined</span>';
            } else if (!inGroup && group.members.length < 5) {
                actionHtml = `<button class="btn" style="padding: 5px 15px; font-size: 0.9rem" onclick="joinGroup('${group.id}')">Join</button>`;
            } else if (group.members.length >= 5) {
                actionHtml = '<span style="color:var(--text-muted);">Full</span>';
            }
            
            div.innerHTML = `
                <div>
                    <span class="flag-icon">${group.flag}</span>
                    <strong>${group.name}</strong> (${group.members.length}/5)
                </div>
                ${actionHtml}
            `;
            groupListEl.appendChild(div);
        }
    }

    // Toggle UI based on group status
    if (inGroup && myGroup) {
        if (gotoBtn) gotoBtn.classList.remove('hidden');
        if (createSection) createSection.classList.add('hidden');
        
        if (myTeamInfo) myTeamInfo.innerText = `${myGroup.flag} ${myGroup.name}`;
        if (myHealthInfo) myHealthInfo.innerText = `❤️ Health: ${myGroup.health}`;
        if (myArmyInfo) {
            let armyStr = `⚔️ Army: ${myGroup.soldiers}`;
            if (myGroup.specialUnit) armyStr += ` + ${myGroup.specialUnit}`;
            myArmyInfo.innerText = armyStr;
        }
        if (myCastleInfo) myCastleInfo.innerText = `🏰 Castle Lv: ${myGroup.castleLevel}`;
    } else {
        if (gotoBtn) gotoBtn.classList.add('hidden');
        if (createSection) createSection.classList.remove('hidden');
    }
    
    // Auto-enter battlefield on war start
    if (state.status === 'war' && inGroup && !setupScreen.classList.contains('hidden')) {
        goToBoard();
    }
});

// ============ Question System ============
let timerInterval = null;

socket.on('new-question', (q) => {
    const panel = document.getElementById('question-panel');
    const qText = document.getElementById('q-text');
    const grid = document.getElementById('q-options');
    const timerEl = document.getElementById('q-timer');
    
    panel.classList.remove('hidden');
    qText.innerText = q.Q;
    grid.innerHTML = '';
    
    q.options.forEach(opt => {
        const btn = document.createElement('button');
        btn.className = 'option-btn';
        btn.innerText = opt;
        btn.addEventListener('click', () => {
            socket.emit('answer', { questionId: q.id, answer: opt });
            panel.classList.add('hidden');
            clearInterval(timerInterval);
        });
        grid.appendChild(btn);
    });

    // Start 60 second timer
    let timeLeft = 60;
    timerEl.innerText = timeLeft;
    clearInterval(timerInterval);
    timerInterval = setInterval(() => {
        timeLeft--;
        timerEl.innerText = timeLeft;
        if (timeLeft <= 10) timerEl.style.color = 'var(--primary)';
        else timerEl.style.color = 'var(--warning)';
        
        if (timeLeft <= 0) {
            clearInterval(timerInterval);
            socket.emit('answer', { questionId: q.id, answer: 'TIMEOUT' });
            panel.classList.add('hidden');
        }
    }, 1000);
});

// ============ Visual Feedback ============
socket.on('correct-answer', (data) => {
    if (data.groupId === myState.groupId) {
        showFlash('✅ Correct! Castle upgraded!', 'correct-flash');
    }
});

socket.on('wrong-answer', (data) => {
    if (data.groupId === myState.groupId) {
        showFlash('❌ Wrong! Castle damaged!', 'wrong-flash');
    }
});

function showFlash(text, className) {
    const el = document.createElement('div');
    el.className = className;
    el.innerText = text;
    document.body.appendChild(el);
    setTimeout(() => el.remove(), 1500);
}

// ============ Fever Mode ============
socket.on('fever-mode', (qStr) => {
    document.getElementById('fever-panel').classList.remove('hidden');
    document.getElementById('fq-text').innerText = qStr;
});

socket.on('fever-winner', (data) => {
    showFlash('🔥 Fever Winner: ' + data.name, 'correct-flash');
});

// ============ War Started ============
socket.on('war-started', () => {
    // Show dramatic war overlay
    const overlay = document.createElement('div');
    overlay.className = 'war-overlay';
    overlay.innerHTML = '<h1>⚔️ THE WAR BEGINS ⚔️</h1>';
    document.body.appendChild(overlay);
    
    // Remove overlay after 3 seconds
    setTimeout(() => overlay.remove(), 3000);
    
    // Auto enter battlefield
    if (!setupScreen.classList.contains('hidden')) {
        goToBoard();
    }
});

// ============ Error Messages ============
socket.on('error-msg', (msg) => {
    alert(msg);
});

console.log('App.js loaded successfully');
