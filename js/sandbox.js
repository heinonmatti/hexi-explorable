/**
 * Sandbox.js
 * Logic for the Terrain Sandbox Editor
 */

class Sandbox {
    constructor() {
        this.canvas = document.getElementById('sandbox-canvas');
        this.ctx = this.canvas.getContext('2d');

        // Configuration
        this.tool = 'lift'; // lift, lower, ball, ruin
        this.terrain = null;
        this.ballPos = { x: 0.25, y: 0.5 }; // Relative coordinates 0-1
        this.ruins = []; // Array of relative {x,y} points

        // Interaction state
        this.isDragging = false;

        // Undo History
        this.history = [];
        this.maxHistory = 20;

        this.init();
    }

    init() {
        this._setupCanvas();
        this._setupEvents();
        this._startLoop();

        // Expose global functions for UI
        window.setTool = (t) => this.setTool(t);
        window.resetTerrain = () => this.reset();
        window.undo = () => this.undo();
        window.exportScen = () => this.export();
        window.importScen = () => this.import();
    }

    setTool(t) {
        this.tool = t;
        document.querySelectorAll('.tool-btn').forEach(b => {
            b.classList.toggle('active', b.dataset.tool === t);
        });
    }

    reset() {
        if (confirm('Are you sure you want to clear/reset the terrain?')) {
            const logicalWidth = this.canvas.width / (window.devicePixelRatio || 1);
            const logicalHeight = this.canvas.height / (window.devicePixelRatio || 1);
            // Increased resolution for better visuals
            this.terrain = new Terrain(logicalWidth, logicalHeight, 512);
            this.history = [];
            this.ruins = [];
            this._updateUndoUI();

            if (window.Act2DefaultLandscape && window.Act2DefaultLandscape.heights) {
                this._loadDefaultFromConfig();
            } else {
                this.ballPos = { x: 0.25, y: 0.5 };
                this._generateDefaultLandscape();
            }
        }
    }

    _setupCanvas() {
        const dpr = window.devicePixelRatio || 1;
        this.canvas.width = window.innerWidth * dpr;
        this.canvas.height = window.innerHeight * dpr;
        this.ctx.scale(dpr, dpr);

        // Logical size for terrain
        const logicalWidth = window.innerWidth;
        const logicalHeight = window.innerHeight;

        // Increased resolution for better visuals
        this.terrain = new Terrain(logicalWidth, logicalHeight, 512);

        if (window.Act2DefaultLandscape && window.Act2DefaultLandscape.heights) {
            this._loadDefaultFromConfig();
        } else {
            this._generateDefaultLandscape();
        }
    }

    _loadDefaultFromConfig() {
        const config = window.Act2DefaultLandscape;
        if (config.ballStart) this.ballPos = config.ballStart;
        if (config.heights && this.terrain) {
            if (config.heights.length === this.terrain.heights.length) {
                this.terrain.heights.set(config.heights);
            } else {
                console.warn("Resolution mismatch in default config");
                // Fallback or resize logic could go here
                this._generateDefaultLandscape();
            }
        }
        this.terrain.smooth(); // Optional cleanup
    }

    _generateDefaultLandscape() {
        if (!this.terrain) return;
        const w = this.terrain.width;
        const h = this.terrain.height;

        // 1. Initial Fractal noise
        for (let i = 0; i < this.terrain.heights.length; i++) this.terrain.heights[i] = 0;
        if (this.terrain.generateFractal) {
            this.terrain.generateFractal();
        }

        // 2. Starting Ridge - 25% X, 50% Y
        this.ballPos = { x: 0.25, y: 0.5 };
        const startX = w * 0.25;
        const startY = h * 0.5;
        this.terrain.raise(startX, startY, 4.0, w * 0.15);

        // 3. C-shaped valley wrapping around the Ridge
        this.terrain.raise(w * 0.35, h * 0.25, -4.0, w * 0.12); // North Arm
        this.terrain.raise(w * 0.2, h * 0.25, -4.0, w * 0.12);
        this.terrain.raise(w * 0.08, h * 0.5, -4.0, w * 0.15);  // Back (West)
        this.terrain.raise(w * 0.2, h * 0.75, -4.0, w * 0.12);  // South Arm
        this.terrain.raise(w * 0.35, h * 0.75, -4.0, w * 0.12);
        this.terrain.raise(w * 0.2, h * 0.85, -3.5, w * 0.15);  // Valley Mouth

        // 4. Middle Barrier (Ridge)
        for (let y = 0; y <= h; y += h / 5) {
            const jX = w * 0.55 + (Math.random() - 0.5) * 50;
            this.terrain.raise(jX, y, 1.4, w * 0.12);
        }

        // 5. Goal Ridge
        const goalPos = { x: w * 0.85, y: h * 0.5 };
        this.terrain.raise(goalPos.x, goalPos.y, 4.0, w * 0.15);

        // Smooth everything
        // Texturize to match manual edits
        this.terrain.addNoise(0.2, 50.0);
    }

    _setupEvents() {
        const getPos = (e) => {
            const rect = this.canvas.getBoundingClientRect();
            const clientX = e.touches ? e.touches[0].clientX : e.clientX;
            const clientY = e.touches ? e.touches[0].clientY : e.clientY;
            return {
                x: (clientX - rect.left),
                y: (clientY - rect.top)
            };
        };

        const handleStart = (e) => {
            e.preventDefault();
            this.isDragging = true;
            this._saveState(); // Save before modification starts
            this._applyTool(getPos(e), true);
        };

        const handleMove = (e) => {
            e.preventDefault();
            if (this.isDragging) {
                this._applyTool(getPos(e), false);
            }
        };

        const handleEnd = () => {
            this.isDragging = false;
        };

        this.canvas.addEventListener('mousedown', handleStart);
        this.canvas.addEventListener('mousemove', handleMove);
        window.addEventListener('mouseup', handleEnd);

        this.canvas.addEventListener('touchstart', handleStart, { passive: false });
        this.canvas.addEventListener('touchmove', handleMove, { passive: false });
        window.addEventListener('touchend', handleEnd);
    }

    _applyTool(pos, isStart = false) {
        const { x, y } = pos;
        const logicalWidth = this.canvas.width / (window.devicePixelRatio || 1);
        const logicalHeight = this.canvas.height / (window.devicePixelRatio || 1);

        const relX = Math.max(0, Math.min(1, x / logicalWidth));
        const relY = Math.max(0, Math.min(1, y / logicalHeight));

        if (this.tool === 'ball') {
            this.ballPos = { x: relX, y: relY };
        } else if (this.tool === 'ruin') {
            if (isStart) {
                // Click to add ruin. Click nearby an existing to remove.
                const threshold = 0.05; // 5% of screen
                let removed = false;
                for (let i = 0; i < this.ruins.length; i++) {
                    const dx = this.ruins[i].x - relX;
                    const dy = this.ruins[i].y - relY;
                    if (Math.hypot(dx, dy) < threshold) {
                        this.ruins.splice(i, 1);
                        removed = true;
                        break;
                    }
                }
                if (!removed) {
                    this.ruins.push({ x: relX, y: relY });
                }
            }
        } else {
            // Terrain modification
            const radius = logicalWidth * 0.1;

            // Get strength from slider
            const strengthSlider = document.getElementById('brush-strength');
            const strengthMult = strengthSlider ? parseFloat(strengthSlider.value) : 0.6;

            const amount = this.tool === 'lift' ? strengthMult : -strengthMult;

            this.terrain.raise(x, y, amount, radius);
            this.terrain.smooth(); // Auto-smooth per click
        }
    }

    _startLoop() {
        const loop = () => {
            this._draw();
            requestAnimationFrame(loop);
        };
        requestAnimationFrame(loop);
    }

    _draw() {
        const w = this.canvas.width / (window.devicePixelRatio || 1);
        const h = this.canvas.height / (window.devicePixelRatio || 1);

        this.ctx.clearRect(0, 0, w, h);

        // Draw Terrain
        if (this.terrain) {
            this.terrain.draw(this.ctx);
        }

        // Draw Ball Marker (Ghost)
        const bx = this.ballPos.x * w;
        const by = this.ballPos.y * h;

        this.ctx.save();
        this.ctx.beginPath();
        this.ctx.arc(bx, by, 15, 0, Math.PI * 2);
        this.ctx.fillStyle = 'rgba(74, 144, 217, 0.8)';
        this.ctx.strokeStyle = 'white';
        this.ctx.lineWidth = 3;
        this.ctx.fill();
        this.ctx.stroke();

        // Label
        this.ctx.fillStyle = 'black';
        this.ctx.font = 'bold 12px monospace';
        this.ctx.textAlign = 'center';
        this.ctx.fillText("START", bx, by - 20);
        this.ctx.restore();

        // Draw Ruins
        this.ctx.save();
        this.ctx.shadowBlur = 10;
        this.ctx.shadowColor = 'red';
        this.ctx.font = '30px sans-serif';
        this.ctx.textAlign = 'center';
        this.ctx.textBaseline = 'middle';
        for (const ruin of this.ruins) {
            const rx = ruin.x * w;
            const ry = ruin.y * h;
            this.ctx.fillText('💀', rx, ry);
        }
        this.ctx.restore();
    }

    export() {
        const data = {
            version: 1,
            ballStart: this.ballPos,
            ruins: this.ruins,
            // Convert Float32Array to regular array for JSON
            heights: Array.from(this.terrain.heights),
            resolution: this.terrain.resolution,
            aspectRatio: this.terrain.width / this.terrain.height // Store aspect ratio to handle resizing logic in Act 2
        };

        const json = JSON.stringify(data);
        navigator.clipboard.writeText(json).then(() => {
            this._showMsg("Copied JSON to clipboard!");
        });
        console.log("Scenario Size:", json.length);
    }

    async import() {
        const json = prompt("Paste Scenario JSON here:");
        if (!json) return;

        try {
            const data = JSON.parse(json);

            // Restore ball
            if (data.ballStart) this.ballPos = data.ballStart;

            // Restore ruins
            if (data.ruins) this.ruins = [...data.ruins];
            else this.ruins = [];

            // Restore heights
            if (data.heights && this.terrain) {
                if (data.heights.length === this.terrain.heights.length) {
                    this.terrain.heights.set(data.heights);
                } else {
                    // Try to resize terrain if resolution mismatch
                    const newRes = Math.sqrt(data.heights.length);
                    if (Number.isInteger(newRes)) {
                        if (confirm(`Resolution mismatch (File: ${newRes}, Current: ${this.terrain.resolution}). Switch resolution?`)) {
                            const logicalWidth = this.canvas.width / (window.devicePixelRatio || 1);
                            const logicalHeight = this.canvas.height / (window.devicePixelRatio || 1);
                            this.terrain = new Terrain(logicalWidth, logicalHeight, newRes);
                            this.terrain.heights.set(data.heights);
                        }
                    } else {
                        alert(`Resolution mismatch! Expected ${this.terrain.heights.length}, got ${data.heights.length}`);
                    }
                }
            }
            this._showMsg("Scenario Loaded!");
        } catch (e) {
            alert("Invalid JSON");
            console.error(e);
        }
    }

    _saveState() {
        if (!this.terrain) return;

        // Push state
        this.history.push({
            heights: new Float32Array(this.terrain.heights),
            ballPos: { ...this.ballPos },
            ruins: [...this.ruins]
        });

        // Limit
        if (this.history.length > this.maxHistory) {
            this.history.shift();
        }

        this._updateUndoUI();
    }

    undo() {
        if (this.history.length === 0) return;

        const state = this.history.pop();
        if (state) {
            this.terrain.heights.set(state.heights);
            this.ballPos = state.ballPos;
            this.ruins = [...(state.ruins || [])];
            this._updateUndoUI();
            this._showMsg("Undo");
        }
    }

    _updateUndoUI() {
        const btn = document.getElementById('btn-undo');
        if (btn) btn.disabled = this.history.length === 0;
    }

    _showMsg(msg) {
        const el = document.getElementById('status-msg');
        el.innerText = msg;
        el.style.opacity = 1;
        setTimeout(() => el.style.opacity = 0, 2000);
    }
}

// Start
window.onload = () => {
    window.sandbox = new Sandbox();
};
