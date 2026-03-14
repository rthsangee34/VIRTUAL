// ============================================
// GAME.JS — Immersive 2D Virtual War Board
// ============================================

function initPhaserGame() {

    // ========== BOOT SCENE (preload assets) ==========
    class BootScene extends Phaser.Scene {
        constructor() { super({ key: 'BootScene' }); }

        create() {
            // Generate textures procedurally since we have no sprite files
            this.generateTextures();
            this.scene.start('WarBoard');
        }

        generateTextures() {
            const g = this.make.graphics({ x: 0, y: 0, add: false });

            // --- Soldier texture (small knight) ---
            g.clear();
            g.fillStyle(0xcc3333, 1);
            g.fillCircle(6, 4, 4);        // head
            g.fillStyle(0x888888, 1);
            g.fillRect(2, 8, 8, 10);       // body (armor)
            g.fillStyle(0x555555, 1);
            g.fillRect(1, 18, 4, 6);       // left leg
            g.fillRect(7, 18, 4, 6);       // right leg
            g.fillStyle(0xdddddd, 1);
            g.fillRect(10, 9, 6, 2);       // sword
            g.generateTexture('soldier', 16, 24);

            // --- Archer texture ---
            g.clear();
            g.fillStyle(0x228833, 1);
            g.fillCircle(6, 4, 4);        // head
            g.fillStyle(0x336633, 1);
            g.fillRect(2, 8, 8, 10);       // body
            g.fillStyle(0x224422, 1);
            g.fillRect(1, 18, 4, 6);
            g.fillRect(7, 18, 4, 6);
            g.lineStyle(2, 0x8B4513);
            g.strokeCircle(12, 10, 5);     // bow
            g.generateTexture('archer', 18, 24);

            // --- Knight texture ---
            g.clear();
            g.fillStyle(0x4488cc, 1);
            g.fillCircle(8, 5, 5);         // head
            g.fillStyle(0x3366aa, 1);
            g.fillRect(3, 10, 10, 12);     // body (heavy armor)
            g.fillStyle(0x224488, 1);
            g.fillRect(2, 22, 5, 7);
            g.fillRect(9, 22, 5, 7);
            g.fillStyle(0xcccccc, 1);
            g.fillRect(13, 10, 8, 3);      // lance
            g.generateTexture('knight', 22, 30);

            // --- Arrow texture ---
            g.clear();
            g.lineStyle(2, 0xFFCC00);
            g.lineBetween(0, 4, 20, 4);
            g.fillStyle(0xFF4444, 1);
            g.fillTriangle(20, 0, 28, 4, 20, 8);
            g.generateTexture('arrow', 28, 8);

            // --- Rock texture ---
            g.clear();
            g.fillStyle(0x666666, 1);
            g.fillCircle(8, 8, 8);
            g.fillStyle(0x555555, 1);
            g.fillCircle(6, 6, 3);
            g.generateTexture('rock', 16, 16);

            // --- Tree texture ---
            g.clear();
            g.fillStyle(0x5C3317, 1);
            g.fillRect(8, 20, 6, 15);      // trunk
            g.fillStyle(0x1B5E20, 1);
            g.fillCircle(11, 12, 12);       // foliage
            g.fillStyle(0x2E7D32, 1);
            g.fillCircle(8, 15, 8);
            g.fillCircle(14, 15, 8);
            g.generateTexture('tree', 24, 35);

            // --- Flag texture ---
            g.clear();
            g.fillStyle(0x8B4513, 1);
            g.fillRect(1, 0, 3, 30);        // pole
            g.fillStyle(0xCC0000, 1);
            g.fillRect(4, 2, 20, 12);       // flag cloth
            g.fillTriangle(4, 14, 24, 14, 14, 8); // flag bottom
            g.generateTexture('flag', 26, 30);

            // --- Smoke particle ---
            g.clear();
            g.fillStyle(0xffffff, 1);
            g.fillCircle(4, 4, 4);
            g.generateTexture('smoke', 8, 8);

            // --- Fire particle ---
            g.clear();
            g.fillStyle(0xff6600, 1);
            g.fillCircle(4, 4, 4);
            g.generateTexture('fire', 8, 8);

            // --- Star particle ---
            g.clear();
            g.fillStyle(0xffff00, 1);
            g.fillCircle(3, 3, 3);
            g.generateTexture('star', 6, 6);

            // --- Grass patch ---
            g.clear();
            g.fillStyle(0x2d5a27, 0.6);
            g.fillRect(0, 0, 40, 8);
            g.fillStyle(0x3a7a32, 0.5);
            for (let i = 0; i < 8; i++) {
                g.fillRect(i * 5, 0, 2, Phaser.Math.Between(3, 8));
            }
            g.generateTexture('grass', 40, 8);

            g.destroy();
        }
    }

    // ========== MAIN WAR BOARD SCENE ==========
    class WarBoard extends Phaser.Scene {
        constructor() {
            super({ key: 'WarBoard' });
            this.castles = {};
            this.gameState = null;
            this.castlePositions = [];
            this.particles = [];
        }

        create() {
            const W = 1200, H = 700;

            // === BACKGROUND: Sky gradient ===
            const skyGfx = this.add.graphics();
            skyGfx.fillGradientStyle(0x1a1a2e, 0x1a1a2e, 0x16213e, 0x0f3460, 1, 1, 1, 1);
            skyGfx.fillRect(0, 0, W, H * 0.55);
            skyGfx.setDepth(-100);

            // === GROUND: Terrain ===
            const groundGfx = this.add.graphics();
            groundGfx.fillGradientStyle(0x2d5a27, 0x2d5a27, 0x1a3a18, 0x1a3a18, 1, 1, 1, 1);
            groundGfx.fillRect(0, H * 0.52, W, H * 0.48);
            groundGfx.setDepth(-99);

            // Terrain texture overlay
            const terrainGfx = this.add.graphics();
            terrainGfx.setDepth(-98);
            terrainGfx.lineStyle(1, 0x3a6a32, 0.2);
            for (let y = H * 0.55; y < H; y += 15) {
                terrainGfx.lineBetween(0, y + Phaser.Math.Between(-2, 2), W, y + Phaser.Math.Between(-2, 2));
            }

            // === MOUNTAINS in background ===
            const mtGfx = this.add.graphics();
            mtGfx.setDepth(-97);
            mtGfx.fillStyle(0x0d1b2a, 0.8);
            // Mountain chain
            const mtPoints = [
                { x: 0, y: H * 0.55 },
                { x: 80, y: H * 0.35 },
                { x: 160, y: H * 0.42 },
                { x: 240, y: H * 0.28 },
                { x: 350, y: H * 0.38 },
                { x: 450, y: H * 0.22 },
                { x: 550, y: H * 0.35 },
                { x: 650, y: H * 0.30 },
                { x: 750, y: H * 0.18 },
                { x: 850, y: H * 0.32 },
                { x: 950, y: H * 0.25 },
                { x: 1050, y: H * 0.38 },
                { x: 1150, y: H * 0.30 },
                { x: W, y: H * 0.55 }
            ];
            mtGfx.beginPath();
            mtGfx.moveTo(0, H * 0.55);
            for (const p of mtPoints) mtGfx.lineTo(p.x, p.y);
            mtGfx.lineTo(W, H * 0.55);
            mtGfx.closePath();
            mtGfx.fillPath();

            // Snow caps
            mtGfx.fillStyle(0xcceeff, 0.3);
            mtGfx.fillTriangle(240, H * 0.28, 220, H * 0.32, 260, H * 0.32);
            mtGfx.fillTriangle(450, H * 0.22, 430, H * 0.27, 470, H * 0.27);
            mtGfx.fillTriangle(750, H * 0.18, 730, H * 0.23, 770, H * 0.23);
            mtGfx.fillTriangle(950, H * 0.25, 935, H * 0.29, 965, H * 0.29);

            // === MOON ===
            const moonGfx = this.add.graphics();
            moonGfx.setDepth(-96);
            moonGfx.fillStyle(0xeeeecc, 0.6);
            moonGfx.fillCircle(950, 80, 40);
            moonGfx.fillStyle(0x1a1a2e, 0.6);
            moonGfx.fillCircle(935, 75, 35); // crescent shadow

            // === STARS ===
            for (let i = 0; i < 50; i++) {
                const sx = Phaser.Math.Between(10, W - 10);
                const sy = Phaser.Math.Between(10, H * 0.4);
                const star = this.add.circle(sx, sy, Phaser.Math.Between(1, 2), 0xffffff, Phaser.Math.FloatBetween(0.3, 0.8));
                star.setDepth(-95);
                // Twinkle
                this.tweens.add({
                    targets: star,
                    alpha: Phaser.Math.FloatBetween(0.1, 0.4),
                    duration: Phaser.Math.Between(1000, 3000),
                    yoyo: true,
                    repeat: -1,
                    ease: 'Sine.easeInOut'
                });
            }

            // === TREES scattered ===
            const treePositions = [30, 100, 180, 350, 480, 700, 820, 1000, 1100, 1170];
            for (const tx of treePositions) {
                const ty = H * 0.52 + Phaser.Math.Between(-10, 10);
                const s = Phaser.Math.FloatBetween(0.6, 1.2);
                const tree = this.add.image(tx, ty, 'tree').setScale(s).setOrigin(0.5, 1);
                tree.setDepth(-5);
                // Gentle sway
                this.tweens.add({
                    targets: tree,
                    angle: Phaser.Math.Between(-2, 2),
                    duration: Phaser.Math.Between(2000, 4000),
                    yoyo: true,
                    repeat: -1,
                    ease: 'Sine.easeInOut'
                });
            }

            // === GRASS patches ===
            for (let i = 0; i < 30; i++) {
                const gx = Phaser.Math.Between(10, W - 10);
                const gy = Phaser.Math.Between(H * 0.55, H - 20);
                this.add.image(gx, gy, 'grass').setScale(Phaser.Math.FloatBetween(0.5, 1.5)).setAlpha(0.5).setDepth(-4);
            }

            // === PATHS between castles ===
            const pathGfx = this.add.graphics();
            pathGfx.setDepth(-3);
            pathGfx.lineStyle(4, 0x5c4033, 0.4);
            // Horizontal paths
            pathGfx.lineBetween(250, H * 0.42, 550, H * 0.42);
            pathGfx.lineBetween(650, H * 0.42, 950, H * 0.42);
            pathGfx.lineBetween(250, H * 0.78, 550, H * 0.78);
            pathGfx.lineBetween(650, H * 0.78, 950, H * 0.78);
            // Vertical paths
            pathGfx.lineBetween(200, H * 0.48, 200, H * 0.72);
            pathGfx.lineBetween(600, H * 0.48, 600, H * 0.72);
            pathGfx.lineBetween(1000, H * 0.48, 1000, H * 0.72);

            // === CASTLE POSITIONS (3 top, 3 bottom) ===
            this.castlePositions = [
                { x: 200, y: H * 0.40 },
                { x: 600, y: H * 0.40 },
                { x: 1000, y: H * 0.40 },
                { x: 200, y: H * 0.76 },
                { x: 600, y: H * 0.76 },
                { x: 1000, y: H * 0.76 }
            ];

            // === BUILD 6 CASTLE SLOTS ===
            for (let i = 0; i < 6; i++) {
                this.createCastleSlot(i);
            }

            // === AMBIENT PARTICLES (floating dust/embers) ===
            for (let i = 0; i < 15; i++) {
                const ember = this.add.circle(
                    Phaser.Math.Between(0, W),
                    Phaser.Math.Between(0, H),
                    Phaser.Math.Between(1, 3),
                    0xffaa44, 0.3
                ).setDepth(50);
                this.tweens.add({
                    targets: ember,
                    x: ember.x + Phaser.Math.Between(-100, 100),
                    y: ember.y - Phaser.Math.Between(50, 200),
                    alpha: 0,
                    duration: Phaser.Math.Between(3000, 8000),
                    repeat: -1,
                    onRepeat: () => {
                        ember.x = Phaser.Math.Between(0, W);
                        ember.y = Phaser.Math.Between(H * 0.3, H);
                        ember.alpha = 0.3;
                    }
                });
            }

            // === REGISTER GLOBAL STATE UPDATER ===
            window.updateGameState = (state) => {
                this.gameState = state;
                this.syncCastles();
            };

            // === DEMO MODE: If no server after 2s, show mock data ===
            this.time.delayedCall(2000, () => {
                if (!this.gameState) {
                    console.log("[PHASER] Entering Demo Mode (No Server Detected)");
                    this.showDemoData();
                }
            });

            // === SOCKET EVENTS: WAR EFFECTS ===
            if (typeof socket !== 'undefined') {
                socket.on('war-started', () => {
                    // Screen shake
                    this.cameras.main.shake(2000, 0.02);
                    this.cameras.main.flash(500, 255, 50, 50);

                    // Epic war text
                    const warText = this.add.text(W / 2, H / 2, '⚔️ THE WAR BEGINS! ⚔️', {
                        fontSize: '56px', fill: '#ff4444', fontStyle: 'bold',
                        fontFamily: 'Cinzel', stroke: '#000000', strokeThickness: 6
                    }).setOrigin(0.5).setDepth(200);

                    this.tweens.add({
                        targets: warText,
                        scaleX: { from: 0.5, to: 1.5 },
                        scaleY: { from: 0.5, to: 1.5 },
                        alpha: { from: 1, to: 0 },
                        duration: 3000,
                        ease: 'Power2',
                        onComplete: () => warText.destroy()
                    });

                    // Spawn fire embers all over
                    for (let f = 0; f < 30; f++) {
                        this.time.delayedCall(f * 100, () => {
                            this.spawnFireEmber(Phaser.Math.Between(50, W - 50), Phaser.Math.Between(100, H - 50));
                        });
                    }
                });

                socket.on('correct-answer', (data) => {
                    const idx = this.getSlotIndex(data.groupId);
                    if (idx !== -1) {
                        const pos = this.castlePositions[idx];
                        // Green sparkles
                        for (let s = 0; s < 10; s++) {
                            const sparkle = this.add.image(pos.x + Phaser.Math.Between(-40, 40), pos.y + Phaser.Math.Between(-30, 30), 'star').setDepth(150);
                            this.tweens.add({
                                targets: sparkle,
                                y: sparkle.y - 50,
                                alpha: 0,
                                scale: 2,
                                duration: 800,
                                onComplete: () => sparkle.destroy()
                            });
                        }
                    }
                });

                socket.on('wrong-answer', (data) => {
                    const idx = this.getSlotIndex(data.groupId);
                    if (idx !== -1) {
                        const pos = this.castlePositions[idx];
                        this.cameras.main.shake(400, 0.008);
                        // Smoke puff
                        for (let s = 0; s < 8; s++) {
                            const smoke = this.add.image(pos.x + Phaser.Math.Between(-30, 30), pos.y + Phaser.Math.Between(-20, 20), 'smoke').setScale(0.5).setAlpha(0.7).setDepth(150).setTint(0x444444);
                            this.tweens.add({
                                targets: smoke,
                                y: smoke.y - 40,
                                alpha: 0,
                                scale: 2,
                                duration: 1000,
                                onComplete: () => smoke.destroy()
                            });
                        }
                    }
                });
            }

            // === BATTLEFIELD TITLE ===
            this.add.text(W / 2, 20, '⚔️ VIRTUAL WAR BATTLEFIELD ⚔️', {
                fontSize: '22px', fill: '#aabbcc', fontFamily: 'Cinzel',
                stroke: '#000000', strokeThickness: 2
            }).setOrigin(0.5).setDepth(100).setAlpha(0.5);
        }

        // ========== CASTLE SLOT CREATION ==========
        createCastleSlot(i) {
            const pos = this.castlePositions[i];
            const slot = {
                id: null,
                container: this.add.container(pos.x, pos.y).setDepth(10),
                gfx: this.add.graphics().setDepth(9),
                nameText: this.add.text(pos.x, pos.y - 85, 'Empty Plot', {
                    fontSize: '14px', fill: '#6a7a8a', fontFamily: 'Outfit',
                    stroke: '#000', strokeThickness: 2
                }).setOrigin(0.5).setDepth(20),
                hpBg: this.add.rectangle(pos.x, pos.y - 70, 100, 6, 0x111111).setOrigin(0.5).setAlpha(0).setDepth(20),
                hpBar: this.add.rectangle(pos.x - 50, pos.y - 70, 100, 6, 0x00e676).setOrigin(0, 0.5).setAlpha(0).setDepth(21),
                statsText: this.add.text(pos.x, pos.y + 55, '', {
                    fontSize: '11px', fill: '#aabbcc', fontFamily: 'Outfit', align: 'center',
                    stroke: '#000', strokeThickness: 2
                }).setOrigin(0.5).setDepth(20),
                armyText: this.add.text(pos.x, pos.y + 75, '', {
                    fontSize: '13px', fill: '#ff6644', fontFamily: 'Outfit', fontStyle: 'bold',
                    stroke: '#000', strokeThickness: 2
                }).setOrigin(0.5).setDepth(20),
                flagSprite: null,
                soldiers: [],
                lastLevel: -1
            };

            // Draw empty plot
            this.drawCastle(slot.gfx, pos.x, pos.y, 0, 0.3);
            this.castles[i] = slot;
        }

        // ========== DRAW CASTLE GRAPHICS ==========
        drawCastle(gfx, x, y, level, alpha) {
            gfx.clear();
            gfx.setAlpha(alpha);

            if (level <= 0) {
                // Empty plot — just a dirt mound
                gfx.fillStyle(0x5c4033, 0.5);
                gfx.fillRect(x - 50, y - 10, 100, 60);
                gfx.fillStyle(0x4a3728, 0.4);
                gfx.fillRect(x - 45, y - 5, 90, 50);
                return;
            }

            // Foundation (Level 1+)
            gfx.fillStyle(0x555555, 1);
            gfx.fillRect(x - 55, y + 20, 110, 30);  // stone foundation
            gfx.fillStyle(0x444444, 1);
            // Stone pattern
            for (let bx = x - 55; bx < x + 55; bx += 12) {
                gfx.fillRect(bx, y + 20, 11, 14);
                gfx.fillRect(bx + 6, y + 35, 11, 14);
            }

            if (level >= 2) {
                // Walls (Level 2+)
                gfx.fillStyle(0x666666, 1);
                gfx.fillRect(x - 50, y - 25, 100, 50);  // main wall
                gfx.fillStyle(0x777777, 1);
                // Brick pattern
                for (let by = y - 25; by < y + 20; by += 10) {
                    for (let bx = x - 50; bx < x + 50; bx += 14) {
                        const offset = (Math.floor((by - y + 25) / 10) % 2) * 7;
                        gfx.fillRect(bx + offset, by, 13, 9);
                    }
                }

                // Window slits
                gfx.fillStyle(0x222222, 1);
                gfx.fillRect(x - 30, y - 15, 5, 12);
                gfx.fillRect(x + 25, y - 15, 5, 12);
            }

            if (level >= 3) {
                // Towers (Level 3+)
                // Left tower
                gfx.fillStyle(0x777777, 1);
                gfx.fillRect(x - 60, y - 50, 22, 70);
                gfx.fillStyle(0x888888, 1);
                gfx.fillRect(x - 62, y - 52, 26, 5); // battlement
                // Right tower
                gfx.fillRect(x + 38, y - 50, 22, 70);
                gfx.fillStyle(0x888888, 1);
                gfx.fillRect(x + 36, y - 52, 26, 5);

                // Tower crenellations
                gfx.fillStyle(0x999999, 1);
                for (let c = 0; c < 4; c++) {
                    gfx.fillRect(x - 62 + c * 8, y - 58, 5, 6);
                    gfx.fillRect(x + 36 + c * 8, y - 58, 5, 6);
                }

                // Tower windows
                gfx.fillStyle(0xffcc00, 0.6);
                gfx.fillRect(x - 53, y - 40, 6, 8);
                gfx.fillRect(x + 45, y - 40, 6, 8);
            }

            if (level >= 4) {
                // Gate (Level 4+)
                gfx.fillStyle(0x8B4513, 1);
                gfx.fillRect(x - 12, y + 5, 24, 20);  // wooden gate
                gfx.fillStyle(0x654321, 1);
                gfx.fillRect(x - 12, y + 5, 12, 20);  // gate panel left
                // Gate arch
                gfx.fillStyle(0x555555, 1);
                gfx.fillRect(x - 15, y + 2, 30, 5);
                // Iron studs on gate
                gfx.fillStyle(0x333333, 1);
                gfx.fillCircle(x - 5, y + 14, 2);
                gfx.fillCircle(x + 5, y + 14, 2);
            }

            if (level >= 5) {
                // Fortress (Level 5 - Full Castle)
                // Central keep / tall tower
                gfx.fillStyle(0x8888aa, 1);
                gfx.fillRect(x - 15, y - 60, 30, 35);
                // Keep crenellations 
                gfx.fillStyle(0x9999bb, 1);
                for (let c = 0; c < 5; c++) {
                    gfx.fillRect(x - 16 + c * 8, y - 66, 5, 6);
                }
                // Keep window (glowing)
                gfx.fillStyle(0xffcc00, 0.8);
                gfx.fillRect(x - 5, y - 52, 10, 12);
                // Banner on keep
                gfx.fillStyle(0xcc0000, 1);
                gfx.fillRect(x - 1, y - 78, 3, 18);   // pole
                gfx.fillRect(x + 2, y - 78, 12, 8);    // banner

                // Extra decorations
                gfx.fillStyle(0xffcc00, 0.4);
                gfx.fillRect(x - 50, y - 26, 100, 2);  // gold trim on walls
            }
        }

        // ========== SPAWN FIRE EMBER EFFECT ==========
        spawnFireEmber(x, y) {
            const ember = this.add.image(x, y, 'fire').setScale(0.5).setAlpha(0.8).setDepth(150);
            this.tweens.add({
                targets: ember,
                y: y - Phaser.Math.Between(50, 150),
                x: x + Phaser.Math.Between(-30, 30),
                alpha: 0,
                scale: 0,
                duration: Phaser.Math.Between(800, 2000),
                onComplete: () => ember.destroy()
            });
        }

        // ========== SPAWN ARROW ATTACK ==========
        spawnArrow(fromX, fromY, toX, toY) {
            const arrow = this.add.image(fromX, fromY, 'arrow').setDepth(100);
            arrow.rotation = Phaser.Math.Angle.Between(fromX, fromY, toX, toY);
            this.tweens.add({
                targets: arrow,
                x: toX, y: toY,
                duration: 600,
                ease: 'Power1',
                onComplete: () => {
                    // Impact smoke
                    const impact = this.add.image(toX, toY, 'smoke').setScale(0.5).setDepth(100);
                    this.tweens.add({
                        targets: impact,
                        scale: 2, alpha: 0,
                        duration: 400,
                        onComplete: () => { impact.destroy(); arrow.destroy(); }
                    });
                }
            });
        }

        // ========== GET SLOT INDEX BY GROUP ID ==========
        getSlotIndex(groupId) {
            for (let i = 0; i < 6; i++) {
                if (this.castles[i].id === groupId) return i;
            }
            return -1;
        }

        showDemoData() {
            const demoState = {
                groups: {
                    'g1': { name: 'Dragon Team', flag: '🐉', health: 85, castleLevel: 5, soldiers: 45, specialUnit: 'Commander', castleParts: ['Foundation','Walls','Tower','Gate','Fortress'], members: [{name:'Demo_1'}] },
                    'g2': { name: 'Lion Knights', flag: '🦁', health: 100, castleLevel: 3, soldiers: 12, specialUnit: 'Archer', castleParts: ['Foundation','Walls','Tower'], members: [{name:'Demo_2'}] },
                    'g3': { name: 'Eagle Clan', flag: '🦅', health: 40, castleLevel: 2, soldiers: 8, specialUnit: null, castleParts: ['Foundation','Walls'], members: [{name:'Demo_3'}] },
                    'g4': { name: 'Snake Venom', flag: '🐍', health: 90, castleLevel: 4, soldiers: 30, specialUnit: 'Knight', castleParts: ['Foundation','Walls','Tower','Gate'], members: [{name:'Demo_4'}] },
                    'g5': { name: 'Dino Force', flag: '🦖', health: 15, castleLevel: 1, soldiers: 5, specialUnit: null, castleParts: ['Foundation'], members: [{name:'Demo_5'}] },
                    'g6': { name: 'Tiger Strike', flag: '🐅', health: 100, castleLevel: 0, soldiers: 0, specialUnit: null, castleParts: [], members: [{name:'Demo_6'}] }
                }
            };
            this.gameState = demoState;
            this.syncCastles();
        }

        // ========== SYNC CASTLES WITH GAME STATE ==========
        syncCastles() {
            if (!this.gameState) return;
            const groupKeys = Object.keys(this.gameState.groups);

            for (let i = 0; i < 6; i++) {
                const slot = this.castles[i];
                const pos = this.castlePositions[i];
                const groupId = groupKeys[i];

                if (groupId) {
                    const group = this.gameState.groups[groupId];
                    slot.id = groupId;

                    // Update name
                    slot.nameText.setText(`${group.flag} ${group.name}`);
                    slot.nameText.setFill('#ffffff');
                    slot.nameText.setFontSize(15);

                    // Redraw castle if level changed
                    if (slot.lastLevel !== group.castleLevel) {
                        slot.lastLevel = group.castleLevel;
                        this.drawCastle(slot.gfx, pos.x, pos.y, group.castleLevel, 1);

                        // Level up sparkle effect
                        if (group.castleLevel > 0) {
                            for (let s = 0; s < 5; s++) {
                                this.time.delayedCall(s * 100, () => {
                                    const sp = this.add.image(pos.x + Phaser.Math.Between(-40, 40), pos.y, 'star').setScale(0.5).setDepth(150);
                                    this.tweens.add({
                                        targets: sp,
                                        y: sp.y - 40,
                                        alpha: 0,
                                        scale: 1.5,
                                        duration: 600,
                                        onComplete: () => sp.destroy()
                                    });
                                });
                            }
                        }
                    }

                    // Flag sprite
                    if (!slot.flagSprite) {
                        slot.flagSprite = this.add.image(pos.x, pos.y - 80, 'flag').setScale(0.7).setDepth(15);
                        // Wave animation
                        this.tweens.add({
                            targets: slot.flagSprite,
                            angle: { from: -3, to: 3 },
                            duration: 1000,
                            yoyo: true,
                            repeat: -1,
                            ease: 'Sine.easeInOut'
                        });
                    }

                    // Health bar
                    slot.hpBg.setAlpha(1);
                    slot.hpBar.setAlpha(1);
                    const hpPct = Math.max(0, group.health) / 100;
                    slot.hpBar.width = 100 * hpPct;
                    if (hpPct > 0.5) slot.hpBar.setFillStyle(0x00e676);
                    else if (hpPct > 0.2) slot.hpBar.setFillStyle(0xffb300);
                    else slot.hpBar.setFillStyle(0xff4b4b);

                    // Stats
                    const parts = group.castleParts.join(', ') || 'None';
                    slot.statsText.setText(`Lv ${group.castleLevel} | HP ${group.health}\n${parts}`);

                    // Army text
                    let armyStr = `${group.soldiers} Soldiers`;
                    if (group.specialUnit) armyStr += ` + ${group.specialUnit}`;
                    slot.armyText.setText(`⚔️ ${armyStr}`);

                    // Soldier sprites marching around castle
                    const targetCount = Math.min(Math.ceil(group.soldiers / 3), 15);
                    while (slot.soldiers.length < targetCount) {
                        const textures = ['soldier', 'soldier', 'soldier', 'archer', 'knight'];
                        const tex = group.specialUnit === 'Knight' ? 'knight' :
                                    group.specialUnit === 'Archer' ? 'archer' : 
                                    textures[Phaser.Math.Between(0, textures.length - 1)];
                        
                        const sx = pos.x + Phaser.Math.Between(-80, 80);
                        const sy = pos.y + Phaser.Math.Between(30, 65);
                        const sol = this.add.image(sx, sy, tex).setScale(0.8).setDepth(12);

                        // March animation (patrol back and forth)
                        const targetX = pos.x + Phaser.Math.Between(-80, 80);
                        this.tweens.add({
                            targets: sol,
                            x: targetX,
                            duration: Phaser.Math.Between(2000, 5000),
                            yoyo: true,
                            repeat: -1,
                            ease: 'Sine.easeInOut',
                            onYoyo: () => { sol.setFlipX(!sol.flipX); },
                            onRepeat: () => { sol.setFlipX(!sol.flipX); }
                        });

                        // Bobbing walk
                        this.tweens.add({
                            targets: sol,
                            y: sy - 3,
                            duration: Phaser.Math.Between(300, 600),
                            yoyo: true,
                            repeat: -1,
                            ease: 'Sine.easeInOut'
                        });

                        slot.soldiers.push(sol);
                    }

                    // Members list around castle
                    const memText = group.members.map(m => m.name).join(', ');
                    if (!slot.membersText) {
                        slot.membersText = this.add.text(pos.x, pos.y + 92, '', {
                            fontSize: '10px', fill: '#88aacc', fontFamily: 'Outfit',
                            stroke: '#000', strokeThickness: 1, align: 'center', wordWrap: { width: 140 }
                        }).setOrigin(0.5).setDepth(20);
                    }
                    slot.membersText.setText(`👥 ${memText}`);

                } else {
                    // Empty slot
                    slot.id = null;
                    slot.nameText.setText('Empty Plot');
                    slot.nameText.setFill('#4a5568');
                    slot.nameText.setFontSize(14);
                    this.drawCastle(slot.gfx, pos.x, pos.y, 0, 0.3);
                    slot.hpBg.setAlpha(0);
                    slot.hpBar.setAlpha(0);
                    slot.statsText.setText('');
                    slot.armyText.setText('');
                    if (slot.flagSprite) { slot.flagSprite.destroy(); slot.flagSprite = null; }
                    if (slot.membersText) { slot.membersText.setText(''); }
                }
            }
        }
    }

    // ========== PHASER CONFIG ==========
    const config = {
        type: Phaser.AUTO,
        width: 1200,
        height: 700,
        parent: 'phaser-game',
        backgroundColor: '#0d0e15',
        scene: [BootScene, WarBoard],
        scale: {
            mode: Phaser.Scale.FIT,
            autoCenter: Phaser.Scale.CENTER_BOTH
        },
        fps: {
            target: 30,
            forceSetTimeOut: true
        }
    };

    window.gameInstance = new Phaser.Game(config);
    console.log('Phaser VR War Game initialized');
}

console.log('Game.js loaded successfully');
