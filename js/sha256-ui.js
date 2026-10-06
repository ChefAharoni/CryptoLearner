document.addEventListener('DOMContentLoaded', () => {
    const startBtn = document.getElementById('start-btn');
    const vizSection = document.getElementById('visualization-section');
    
    // Controls
    const prevBtn = document.getElementById('prev-btn');
    const nextBtn = document.getElementById('next-btn');
    const playPauseBtn = document.getElementById('play-pause-btn');
    const jumpSelect = document.getElementById('jump-select');
    const speedSlider = document.getElementById('speed-slider');
    const speedDisplay = document.getElementById('speed-display');
    let speedMultiplier = 1 / 0.5; // Default 0.5x
    
    if (speedSlider) {
        speedSlider.addEventListener('input', (e) => {
            const val = parseFloat(e.target.value);
            speedMultiplier = 1 / val;
            speedDisplay.textContent = val.toFixed(2) + 'x';
        });
    }

    const stepName = document.getElementById('current-step-name');
    const stepDesc = document.getElementById('current-step-desc');
    const learnMoreLink = document.getElementById('learn-more-link');
    const chunkCounter = document.getElementById('chunk-counter');
    const totalChunks = document.getElementById('total-chunks');
    const wGrid = document.getElementById('w-grid');
    
    let hashData = null;
    let currentChunkIndex = 0;
    let currentTraceIndex = 0;
    let isPlaying = false;
    let isAnimating = false;
    let previousVars = null;

    const sleep = ms => new Promise(r => setTimeout(r, ms));

    function toHex32(num) {
        return (num >>> 0).toString(16).padStart(8, '0').toUpperCase();
    }

    // Init W Grid
    for(let i=0; i<64; i++) {
        let el = document.createElement('div');
        el.className = 'word-cell';
        el.id = `w-${i}`;
        el.textContent = '00000000';
        wGrid.appendChild(el);
    }

    startBtn.addEventListener('click', () => {
        const msg = document.getElementById('message').value;
        if (!msg && msg !== "") {
            alert('Please enter a message.');
            return;
        }
        
        hashData = processSHA256Message(msg);
        currentChunkIndex = 0;
        currentTraceIndex = 0;
        totalChunks.textContent = hashData.length;
        previousVars = null;
        
        vizSection.style.display = 'block';
        vizSection.scrollIntoView({ behavior: 'smooth' });
        updateUI();
    });

    function getLearnMoreLink(stepName) {
        const base = 'https://en.wikipedia.org/wiki/SHA-2';
        if (stepName.includes('Padding')) return base + '#Pseudocode';
        if (stepName.includes('Expansion')) return base + '#Pseudocode';
        if (stepName.includes('Round')) return base + '#Pseudocode';
        return base;
    }

    function renderState(trace) {
        const vars = trace.vars;
        ['a','b','c','d','e','f','g','h'].forEach(v => {
            const el = document.getElementById(`reg-${v}`);
            el.textContent = toHex32(vars[v]);
            el.style.backgroundColor = '';
        });
        
        for(let i=0; i<64; i++) {
            const el = document.getElementById(`w-${i}`);
            el.textContent = toHex32(trace.W[i]);
            el.classList.remove('active');
            if (trace.activeW === i) {
                el.classList.add('active');
            }
        }
    }

    function disableControls(disabled) {
        prevBtn.disabled = disabled || (currentChunkIndex === 0 && currentTraceIndex === 0);
        const block = hashData[currentChunkIndex];
        const isEnd = (currentChunkIndex === hashData.length - 1 && currentTraceIndex === block.traces.length - 1);
        nextBtn.disabled = disabled || isEnd;
        jumpSelect.disabled = disabled;
    }

    async function animateCompression(oldVars, newVars) {
        // Just flash the registers that drastically change mathematically (A and E get the non-linear math)
        // B,C,D and F,G,H are just shifted.
        ['a','e'].forEach(v => {
            document.getElementById(`reg-${v}`).style.backgroundColor = 'var(--highlight-color)';
        });
        await sleep(400 * speedMultiplier);
        
        ['a','b','c','d','e','f','g','h'].forEach(v => {
            document.getElementById(`reg-${v}`).textContent = toHex32(newVars[v]);
        });
        
        await sleep(300 * speedMultiplier);
        
        ['a','e'].forEach(v => {
            document.getElementById(`reg-${v}`).style.backgroundColor = '';
        });
    }

    async function updateUI() {
        if (isAnimating) return;
        isAnimating = true;
        
        const block = hashData[currentChunkIndex];
        const trace = block.traces[currentTraceIndex];
        
        chunkCounter.textContent = currentChunkIndex + 1;
        stepName.textContent = trace.name;
        stepDesc.textContent = trace.description;
        learnMoreLink.href = getLearnMoreLink(trace.name);
        
        if (trace.round !== undefined) {
             let jVal = typeof trace.round === 'number' ? trace.round.toString() : trace.round;
             // Don't auto set "skip" in dropdown
             if (jVal !== "skip") jumpSelect.value = jVal;
        }
        
        disableControls(true);

        if (previousVars) {
            // Restore previous grid values quickly to base animation on it
            for(let i=0; i<64; i++) {
                document.getElementById(`w-${i}`).textContent = toHex32(block.traces[Math.max(0, currentTraceIndex-1)].W[i]);
            }
            if (trace.name.includes("Round") && !trace.name.includes("3-62")) {
                await animateCompression(previousVars, trace.vars);
            } else {
                await sleep(300 * speedMultiplier);
            }
        }
        
        renderState(trace);
        previousVars = { ...trace.vars };
        
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
        const block = hashData[currentChunkIndex];
        if (currentTraceIndex < block.traces.length - 1) {
            currentTraceIndex++;
            updateUI();
        } else if (currentChunkIndex < hashData.length - 1) {
            currentChunkIndex++;
            currentTraceIndex = 0;
            previousVars = null;
            updateUI();
        } else {
            pauseAnimation();
        }
    }

    function prevStep() {
        if (isAnimating) return;
        if (currentTraceIndex > 0) {
            currentTraceIndex--;
        } else if (currentChunkIndex > 0) {
            currentChunkIndex--;
            currentTraceIndex = hashData[currentChunkIndex].traces.length - 1;
        }
        previousVars = null;
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
    nextBtn.addEventListener('click', () => { pauseAnimation(); nextStep(); });
    prevBtn.addEventListener('click', () => { pauseAnimation(); prevStep(); });

    jumpSelect.addEventListener('change', (e) => {
        if (!e.target.value) return;
        pauseAnimation();
        const targetRound = e.target.value;
        const block = hashData[currentChunkIndex];
        
        for (let i = 0; i < block.traces.length; i++) {
            if (block.traces[i].round == targetRound) {
                currentTraceIndex = i;
                previousVars = null;
                updateUI();
                break;
            }
        }
    });
});
