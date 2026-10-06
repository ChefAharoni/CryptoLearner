document.addEventListener('DOMContentLoaded', () => {
    const startBtn = document.getElementById('start-btn');
    const modeSelect = document.getElementById('mode');
    const ivGroup = document.getElementById('iv-group');
    const configSection = document.getElementById('config-section');
    const vizSection = document.getElementById('visualization-section');
    
    // Controls
    const prevBtn = document.getElementById('prev-btn');
    const nextBtn = document.getElementById('next-btn');
    const playPauseBtn = document.getElementById('play-pause-btn');
    const skipBlockBtn = document.getElementById('skip-block-btn');
    const jumpSelect = document.getElementById('jump-select');
    
    // Speed Control
    const speedSlider = document.getElementById('speed-slider');
    const speedDisplay = document.getElementById('speed-display');
    let speedMultiplier = 1 / 0.5; // Default 0.5x speed -> 2.0 duration multiplier
    
    if (speedSlider) {
        speedSlider.addEventListener('input', (e) => {
            const val = parseFloat(e.target.value);
            speedMultiplier = 1 / val;
            speedDisplay.textContent = val.toFixed(2) + 'x';
        });
    }

    // Grids
    const stateGrid = document.getElementById('state-grid');
    const asciiGrid = document.getElementById('ascii-grid');
    const roundKeyGrid = document.getElementById('round-key-grid');
    const roundKeyWrapper = document.getElementById('round-key-wrapper');
    const roundKeyTitle = document.getElementById('round-key-title');
    
    // Status
    const stepName = document.getElementById('current-step-name');
    const stepDesc = document.getElementById('current-step-desc');
    const learnMoreLink = document.getElementById('learn-more-link');
    const blockCounter = document.getElementById('block-counter');
    const totalBlocks = document.getElementById('total-blocks');
    
    let encryptionData = null;
    let currentBlockIndex = 0;
    let currentTraceIndex = 0;
    
    let isPlaying = false;
    let isAnimating = false;
    let previousState = null;

    const sleep = ms => new Promise(r => setTimeout(r, ms));

    modeSelect.addEventListener('change', (e) => {
        if (e.target.value === 'CBC') {
            ivGroup.style.display = 'block';
            document.getElementById('mode-explanation').innerHTML = `
                <strong>CBC Mode:</strong> Cipher Block Chaining. Each plaintext block is XORed with the previous ciphertext block before encryption.
                <br>Provides better security than ECB as identical plaintext blocks produce different ciphertext. Requires an Initialization Vector (IV).
            `;
        } else {
            ivGroup.style.display = 'none';
            document.getElementById('mode-explanation').innerHTML = `
                <strong>ECB Mode:</strong> The simplest encryption mode. Each block is encrypted independently. 
                <br><span class="warning">Weakness:</span> Identical plaintext blocks produce identical ciphertext blocks, revealing patterns in the data.
            `;
        }
    });

    // Generate grid cells
    function createCells(gridEl, prefix) {
        gridEl.innerHTML = ''; // clear
        for(let r = 0; r < 4; r++) {
            for(let c = 0; c < 4; c++) {
                let cell = document.createElement('div');
                cell.className = 'hex-cell';
                cell.id = `${prefix}-${r}-${c}`;
                gridEl.appendChild(cell);
            }
        }
    }

    createCells(stateGrid, 'hex');
    createCells(asciiGrid, 'ascii');
    createCells(roundKeyGrid, 'rk');

    startBtn.addEventListener('click', () => {
        const msg = document.getElementById('message').value;
        const key = document.getElementById('key').value;
        const mode = modeSelect.value;
        const iv = document.getElementById('iv').value;
        
        if (!msg || !key) {
            alert('Please enter a message and a key.');
            return;
        }
        
        encryptionData = processMessage(msg, key, mode, iv);
        
        currentBlockIndex = 0;
        currentTraceIndex = 0;
        totalBlocks.textContent = encryptionData.allTraces.length;
        previousState = null;
        
        vizSection.style.display = 'block';
        vizSection.scrollIntoView({ behavior: 'smooth' });
        updateUI();
    });

    function getLearnMoreLink(stepName) {
        const base = 'https://en.wikipedia.org/wiki/Advanced_Encryption_Standard';
        if (stepName.includes('SubBytes')) return base + '#SubBytes_step';
        if (stepName.includes('ShiftRows')) return base + '#ShiftRows_step';
        if (stepName.includes('MixColumns')) return base + '#MixColumns_step';
        if (stepName.includes('AddRoundKey')) return base + '#AddRoundKey_step';
        if (stepName.includes('CBC')) return 'https://en.wikipedia.org/wiki/Block_cipher_mode_of_operation#Cipher_Block_Chaining_(CBC)';
        return base;
    }

    function toHex(num) {
        return num.toString(16).padStart(2, '0').toUpperCase();
    }

    function toAscii(num) {
        return (num >= 32 && num <= 126) ? String.fromCharCode(num) : '.';
    }

    function renderStateGrid(state) {
        for(let c = 0; c < 4; c++) {
            for(let r = 0; r < 4; r++) {
                const hexEl = document.getElementById(`hex-${r}-${c}`);
                const asciiEl = document.getElementById(`ascii-${r}-${c}`);
                hexEl.textContent = toHex(state[r][c]);
                asciiEl.textContent = toAscii(state[r][c]);
                
                // reset styling
                hexEl.style.backgroundColor = '';
                asciiEl.style.backgroundColor = '';
                hexEl.style.transform = 'none';
                hexEl.style.opacity = '1';
                hexEl.style.transition = 'none';
            }
        }
    }

    function disableControls(disabled) {
        prevBtn.disabled = disabled || (currentBlockIndex === 0 && currentTraceIndex === 0);
        
        const block = encryptionData.allTraces[currentBlockIndex];
        const isEnd = (currentBlockIndex === encryptionData.allTraces.length - 1 && currentTraceIndex === block.traces.length - 1);
        nextBtn.disabled = disabled || isEnd;
        skipBlockBtn.disabled = disabled || (currentBlockIndex === encryptionData.allTraces.length - 1);
        jumpSelect.disabled = disabled;
    }

    // --- CHOREOGRAPHED ANIMATIONS ---
    
    async function animateShiftRows(oldState, newState) {
        for(let r = 1; r < 4; r++) { 
            for(let c = 0; c < 4; c++) {
                let cell = document.getElementById(`hex-${r}-${c}`);
                let duration = 0.6 * speedMultiplier;
                cell.style.transition = `transform ${duration}s ease-in, opacity ${duration}s ease-in`;
                cell.style.backgroundColor = 'var(--highlight-color)';
                
                let shiftPx = -64 * r; 
                cell.style.transform = `translateX(${shiftPx}px)`;
                cell.style.opacity = '0.2'; 
            }
        }
        await sleep(700 * speedMultiplier);
    }

    async function animateMixColumns(oldState, newState) {
        for(let c = 0; c < 4; c++) {
            for(let r = 0; r < 4; r++) {
                document.getElementById(`hex-${r}-${c}`).style.backgroundColor = 'var(--highlight-color)';
            }
            await sleep(250 * speedMultiplier);
            
            for(let r = 0; r < 4; r++) {
                document.getElementById(`hex-${r}-${c}`).textContent = toHex(newState[r][c]);
                document.getElementById(`ascii-${r}-${c}`).textContent = toAscii(newState[r][c]);
            }
            await sleep(250 * speedMultiplier);
            
            for(let r = 0; r < 4; r++) {
                document.getElementById(`hex-${r}-${c}`).style.backgroundColor = '';
            }
        }
    }

    async function animateXOR(oldState, newState, roundKey) {
        for(let c = 0; c < 4; c++) {
            for(let r = 0; r < 4; r++) {
                document.getElementById(`hex-${r}-${c}`).style.backgroundColor = '#1abc9c';
                document.getElementById(`rk-${r}-${c}`).style.backgroundColor = 'var(--highlight-color)';
            }
            await sleep(250 * speedMultiplier);
            
            for(let r = 0; r < 4; r++) {
                document.getElementById(`hex-${r}-${c}`).textContent = toHex(newState[r][c]);
                document.getElementById(`ascii-${r}-${c}`).textContent = toAscii(newState[r][c]);
                document.getElementById(`hex-${r}-${c}`).style.backgroundColor = 'var(--highlight-color)';
                document.getElementById(`rk-${r}-${c}`).style.backgroundColor = '';
            }
            await sleep(250 * speedMultiplier);
            
            for(let r = 0; r < 4; r++) {
                document.getElementById(`hex-${r}-${c}`).style.backgroundColor = '';
            }
        }
    }

    async function animateSubBytes(oldState, newState) {
        for(let r = 0; r < 4; r++) {
            for(let c = 0; c < 4; c++) {
                document.getElementById(`hex-${r}-${c}`).style.backgroundColor = 'var(--highlight-color)';
            }
        }
        await sleep(250 * speedMultiplier);
        
        for(let r = 0; r < 4; r++) {
            for(let c = 0; c < 4; c++) {
                document.getElementById(`hex-${r}-${c}`).textContent = toHex(newState[r][c]);
                document.getElementById(`ascii-${r}-${c}`).textContent = toAscii(newState[r][c]);
            }
        }
        await sleep(250 * speedMultiplier);
        
        for(let r = 0; r < 4; r++) {
            for(let c = 0; c < 4; c++) {
                document.getElementById(`hex-${r}-${c}`).style.backgroundColor = '';
            }
        }
    }

    // --- MAIN RENDER LOOP ---

    async function updateUI() {
        if (isAnimating) return;
        isAnimating = true;
        
        const block = encryptionData.allTraces[currentBlockIndex];
        const trace = block.traces[currentTraceIndex];
        
        blockCounter.textContent = currentBlockIndex + 1;
        stepName.textContent = trace.name;
        stepDesc.textContent = trace.description;
        learnMoreLink.href = getLearnMoreLink(trace.name);
        jumpSelect.value = trace.round !== undefined ? trace.round : "";
        
        disableControls(true);

        if (trace.roundKey) {
            roundKeyWrapper.style.display = 'block';
            roundKeyTitle.textContent = trace.name.includes('CBC') ? 'XOR Data (IV/Prev Block)' : 'Round Key Applied (Hex)';
            for(let c = 0; c < 4; c++) {
                for(let r = 0; r < 4; r++) {
                    const rkEl = document.getElementById(`rk-${r}-${c}`);
                    rkEl.textContent = toHex(trace.roundKey[r][c]);
                }
            }
        } else {
            roundKeyWrapper.style.display = 'none';
        }
        
        // Animate transition if we have a previous state
        if (previousState) {
            renderStateGrid(previousState);
            
            if (trace.name.includes("ShiftRows")) await animateShiftRows(previousState, trace.state);
            else if (trace.name.includes("MixColumns")) await animateMixColumns(previousState, trace.state);
            else if (trace.name.includes("AddRoundKey") || trace.name.includes("CBC XOR")) await animateXOR(previousState, trace.state, trace.roundKey);
            else if (trace.name.includes("SubBytes")) await animateSubBytes(previousState, trace.state);
            else await sleep(250 * speedMultiplier);
        }
        
        // Finalize state grid
        renderStateGrid(trace.state);
        previousState = cloneState(trace.state);
        
        isAnimating = false;
        disableControls(false);

        if (isPlaying) {
            setTimeout(() => {
                if (isPlaying && !isAnimating) nextStep();
            }, 600 * speedMultiplier);
        }
    }

    function nextStep() {
        if (isAnimating) return;
        const block = encryptionData.allTraces[currentBlockIndex];
        if (currentTraceIndex < block.traces.length - 1) {
            currentTraceIndex++;
            updateUI();
        } else if (currentBlockIndex < encryptionData.allTraces.length - 1) {
            currentBlockIndex++;
            currentTraceIndex = 0;
            previousState = null;
            updateUI();
        } else {
            pauseAnimation();
        }
    }

    function prevStep() {
        if (isAnimating) return;
        if (currentTraceIndex > 0) {
            currentTraceIndex--;
        } else if (currentBlockIndex > 0) {
            currentBlockIndex--;
            currentTraceIndex = encryptionData.allTraces[currentBlockIndex].traces.length - 1;
        }
        previousState = null; // Snap straight to previous state, no reverse animation
        updateUI();
    }

    function playAnimation() {
        isPlaying = true;
        playPauseBtn.textContent = 'Pause Animation';
        if (!isAnimating) nextStep();
    }

    function pauseAnimation() {
        isPlaying = false;
        playPauseBtn.textContent = 'Play Animation';
    }

    playPauseBtn.addEventListener('click', () => {
        if (isPlaying) pauseAnimation();
        else playAnimation();
    });

    nextBtn.addEventListener('click', () => {
        pauseAnimation();
        nextStep();
    });

    prevBtn.addEventListener('click', () => {
        pauseAnimation();
        prevStep();
    });

    skipBlockBtn.addEventListener('click', () => {
        pauseAnimation();
        if (currentBlockIndex < encryptionData.allTraces.length - 1) {
            currentBlockIndex++;
            currentTraceIndex = 0;
            previousState = null;
            updateUI();
        }
    });

    jumpSelect.addEventListener('change', (e) => {
        if (!e.target.value) return;
        pauseAnimation();
        const targetRound = parseInt(e.target.value);
        
        const block = encryptionData.allTraces[currentBlockIndex];
        for (let i = 0; i < block.traces.length; i++) {
            if (block.traces[i].round === targetRound) {
                currentTraceIndex = i;
                previousState = null;
                updateUI();
                break;
            }
        }
    });
});
