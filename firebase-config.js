const admin = require('firebase-admin');
const path = require('path');
const fs = require('fs');

// Path to the service account key file
const serviceAccountPath = path.join(__dirname, 'serviceAccountKey.json');

let db = null;

try {
    if (fs.existsSync(serviceAccountPath)) {
        const serviceAccount = require(serviceAccountPath);
        admin.initializeApp({
            credential: admin.credential.cert(serviceAccount),
            // IMPORTANT: Replace the URL below with your Realtime Database URL
            databaseURL: "https://YOUR_PROJECT_ID_DEFAULT_RTDB.firebaseio.com"
        });
        db = admin.database();
        console.log('[FIREBASE] Connected successfully using serviceAccountKey.json');
    } else {
        console.warn('[FIREBASE] serviceAccountKey.json not found. Game will run in memory-only mode.');
    }
} catch (error) {
    console.error('[FIREBASE] Initialization error:', error.message);
}

const dbRef = db ? db.ref('gameState') : null;

// Helper to save state
async function saveState(state) {
    if (dbRef) {
        try {
            await dbRef.set(state);
        } catch (error) {
            console.error('[FIREBASE] Error saving state:', error.message);
        }
    }
}

// Helper to load state
async function loadState() {
    if (dbRef) {
        try {
            const snapshot = await dbRef.once('value');
            if (snapshot.exists()) {
                console.log('[FIREBASE] State loaded from database');
                return snapshot.val();
            }
        } catch (error) {
            console.error('[FIREBASE] Error loading state:', error.message);
        }
    }
    return null;
}

module.exports = { saveState, loadState };
