const SBOX = [
    0x63, 0x7c, 0x77, 0x7b, 0xf2, 0x6b, 0x6f, 0xc5, 0x30, 0x01, 0x67, 0x2b, 0xfe, 0xd7, 0xab, 0x76,
    0xca, 0x82, 0xc9, 0x7d, 0xfa, 0x59, 0x47, 0xf0, 0xad, 0xd4, 0xa2, 0xaf, 0x9c, 0xa4, 0x72, 0xc0,
    0xb7, 0xfd, 0x93, 0x26, 0x36, 0x3f, 0xf7, 0xcc, 0x34, 0xa5, 0xe5, 0xf1, 0x71, 0xd8, 0x31, 0x15,
    0x04, 0xc7, 0x23, 0xc3, 0x18, 0x96, 0x05, 0x9a, 0x07, 0x12, 0x80, 0xe2, 0xeb, 0x27, 0xb2, 0x75,
    0x09, 0x83, 0x2c, 0x1a, 0x1b, 0x6e, 0x5a, 0xa0, 0x52, 0x3b, 0xd6, 0xb3, 0x29, 0xe3, 0x2f, 0x84,
    0x53, 0xd1, 0x00, 0xed, 0x20, 0xfc, 0xb1, 0x5b, 0x6a, 0xcb, 0xbe, 0x39, 0x4a, 0x4c, 0x58, 0xcf,
    0xd0, 0xef, 0xaa, 0xfb, 0x43, 0x4d, 0x33, 0x85, 0x45, 0xf9, 0x02, 0x7f, 0x50, 0x3c, 0x9f, 0xa8,
    0x51, 0xa3, 0x40, 0x8f, 0x92, 0x9d, 0x38, 0xf5, 0xbc, 0xb6, 0xda, 0x21, 0x10, 0xff, 0xf3, 0xd2,
    0xcd, 0x0c, 0x13, 0xec, 0x5f, 0x97, 0x44, 0x17, 0xc4, 0xa7, 0x7e, 0x3d, 0x64, 0x5d, 0x19, 0x73,
    0x60, 0x81, 0x4f, 0xdc, 0x22, 0x2a, 0x90, 0x88, 0x46, 0xee, 0xb8, 0x14, 0xde, 0x5e, 0x0b, 0xdb,
    0xe0, 0x32, 0x3a, 0x0a, 0x49, 0x06, 0x24, 0x5c, 0xc2, 0xd3, 0xac, 0x62, 0x91, 0x95, 0xe4, 0x79,
    0xe7, 0xc8, 0x37, 0x6d, 0x8d, 0xd5, 0x4e, 0xa9, 0x6c, 0x56, 0xf4, 0xea, 0x65, 0x7a, 0xae, 0x08,
    0xba, 0x78, 0x25, 0x2e, 0x1c, 0xa6, 0xb4, 0xc6, 0xe8, 0xdd, 0x74, 0x1f, 0x4b, 0xbd, 0x8b, 0x8a,
    0x70, 0x3e, 0xb5, 0x66, 0x48, 0x03, 0xf6, 0x0e, 0x61, 0x35, 0x57, 0xb9, 0x86, 0xc1, 0x1d, 0x9e,
    0xe1, 0xf8, 0x98, 0x11, 0x69, 0xd9, 0x8e, 0x94, 0x9b, 0x1e, 0x87, 0xe9, 0xce, 0x55, 0x28, 0xdf,
    0x8c, 0xa1, 0x89, 0x0d, 0xbf, 0xe6, 0x42, 0x68, 0x41, 0x99, 0x2d, 0x0f, 0xb0, 0x54, 0xbb, 0x16
];

const RCON = [
    0x00, 0x01, 0x02, 0x04, 0x08, 0x10, 0x20, 0x40, 0x80, 0x1b, 0x36
];

// Helper to deep copy the 4x4 state matrix
function cloneState(state) {
    return state.map(row => [...row]);
}

// AES Galois Field Multiplication
function gmul(a, b) {
    let p = 0;
    for (let c = 0; c < 8; c++) {
        if (b & 1) p ^= a;
        let hiBitSet = a & 0x80;
        a <<= 1;
        if (hiBitSet) a ^= 0x11b; // x^8 + x^4 + x^3 + x + 1
        b >>= 1;
    }
    return p % 256;
}

class AES128Visualizer {
    constructor(keyBytes) {
        this.key = keyBytes;
        this.w = this.keyExpansion(keyBytes);
        this.trace = [];
    }

    addTrace(name, round, state, description, highlight = null, roundKey = null) {
        this.trace.push({
            name,
            round,
            state: cloneState(state),
            description,
            highlight,
            roundKey: roundKey ? cloneState(roundKey) : null
        });
    }

    getRoundKeyMatrix(round) {
        let rk = [[0,0,0,0], [0,0,0,0], [0,0,0,0], [0,0,0,0]];
        for (let c = 0; c < 4; c++) {
            for (let r = 0; r < 4; r++) {
                rk[r][c] = this.w[round * 4 + c][r];
            }
        }
        return rk;
    }

    keyExpansion(key) {
        let w = [];
        for (let i = 0; i < 4; i++) {
            w.push([key[4*i], key[4*i+1], key[4*i+2], key[4*i+3]]);
        }
        for (let i = 4; i < 44; i++) {
            let temp = [...w[i-1]];
            if (i % 4 === 0) {
                // RotWord
                let t = temp[0];
                temp[0] = temp[1];
                temp[1] = temp[2];
                temp[2] = temp[3];
                temp[3] = t;
                // SubWord
                for (let j = 0; j < 4; j++) temp[j] = SBOX[temp[j]];
                // Rcon
                temp[0] ^= RCON[i/4];
            }
            w.push([w[i-4][0] ^ temp[0], w[i-4][1] ^ temp[1], w[i-4][2] ^ temp[2], w[i-4][3] ^ temp[3]]);
        }
        return w;
    }

    // Convert 1D block array to 4x4 column-major state matrix
    bufferToState(buf) {
        let state = [ [], [], [], [] ];
        for (let i = 0; i < 16; i++) {
            state[i % 4].push(buf[i]);
        }
        return state;
    }
    
    stateToBuffer(state) {
        let buf = new Array(16);
        for(let c=0; c<4; c++) {
            for(let r=0; r<4; r++) {
                buf[r + 4*c] = state[r][c];
            }
        }
        return buf;
    }

    addRoundKey(state, round) {
        for (let c = 0; c < 4; c++) {
            for (let r = 0; r < 4; r++) {
                state[r][c] ^= this.w[round * 4 + c][r];
            }
        }
    }

    subBytes(state) {
        for (let r = 0; r < 4; r++) {
            for (let c = 0; c < 4; c++) {
                state[r][c] = SBOX[state[r][c]];
            }
        }
    }

    shiftRows(state) {
        let temp = [];
        for (let r = 1; r < 4; r++) {
            temp = [...state[r]];
            for (let c = 0; c < 4; c++) {
                state[r][c] = temp[(c + r) % 4];
            }
        }
    }

    mixColumns(state) {
        for (let c = 0; c < 4; c++) {
            let col = [state[0][c], state[1][c], state[2][c], state[3][c]];
            state[0][c] = gmul(0x02, col[0]) ^ gmul(0x03, col[1]) ^ col[2] ^ col[3];
            state[1][c] = col[0] ^ gmul(0x02, col[1]) ^ gmul(0x03, col[2]) ^ col[3];
            state[2][c] = col[0] ^ col[1] ^ gmul(0x02, col[2]) ^ gmul(0x03, col[3]);
            state[3][c] = gmul(0x03, col[0]) ^ col[1] ^ col[2] ^ gmul(0x02, col[3]);
        }
    }

    encryptBlock(blockBytes) {
        this.trace = []; // reset trace for this block
        let state = this.bufferToState(blockBytes);
        
        this.addTrace("Initial State", 0, state, "The 16-byte block is arranged into a 4x4 column-major grid called the State.");
        
        let rk0 = this.getRoundKeyMatrix(0);
        this.addRoundKey(state, 0);
        this.addTrace("AddRoundKey", 0, state, "Initial AddRoundKey: The state is XORed with Round Key 0. Notice the Round Key shown below is exactly the master key you entered.", null, rk0);

        for (let round = 1; round <= 10; round++) {
            let descPrefix = `Round ${round}`;
            let skipDetails = round > 3 && round < 10; // We detail 1-3 and 10 as requested
            
            this.subBytes(state);
            if (!skipDetails) {
                this.addTrace("SubBytes", round, state, `${descPrefix}: SubBytes step. Each byte is substituted using the Rijndael S-Box, adding non-linearity.`);
            }

            this.shiftRows(state);
            if (!skipDetails) {
                this.addTrace("ShiftRows", round, state, `${descPrefix}: ShiftRows step. Rows 1 to 3 are cyclically shifted to the left by 1, 2, and 3 positions respectively. This ensures columns interact.`);
            }

            if (round < 10) {
                this.mixColumns(state);
                if (!skipDetails) {
                    this.addTrace("MixColumns", round, state, `${descPrefix}: MixColumns step. Each column is mathematically mixed using Galois Field multiplication. This provides diffusion.`);
                }
            } else {
                this.addTrace("No MixColumns", 10, state, "Round 10: The MixColumns step is intentionally omitted in the final round of AES.");
            }

            let rk = this.getRoundKeyMatrix(round);
            this.addRoundKey(state, round);
            
            if (skipDetails && round === 9) {
                 this.addTrace("Rounds 4-9", 9, state, "Rounds 4 through 9 perform the exact same 4 steps (SubBytes, ShiftRows, MixColumns, AddRoundKey) as rounds 1-3. We've fast-forwarded through them.");
            } else if (!skipDetails) {
                this.addTrace("AddRoundKey", round, state, `${descPrefix}: AddRoundKey step. The previous state is XORed with Round Key ${round} (derived from your master key via the Key Expansion schedule) to produce the new state shown above.`, null, rk);
            }
        }
        
        this.addTrace("Final Ciphertext", 10, state, "The final 4x4 state represents the encrypted 16-byte ciphertext block.");
        return { cipherBytes: this.stateToBuffer(state), trace: this.trace };
    }
}

// Function to convert string to bytes, padding with PKCS7
function stringToBytesAndPad(str) {
    let bytes = [];
    for (let i = 0; i < str.length; i++) {
        bytes.push(str.charCodeAt(i));
    }
    let padLen = 16 - (bytes.length % 16);
    for (let i = 0; i < padLen; i++) {
        bytes.push(padLen);
    }
    return bytes;
}

// XOR two byte arrays of the same length
function xorBytes(a, b) {
    return a.map((val, i) => val ^ b[i]);
}

function processMessage(message, keyStr, mode = 'ECB', ivStr = '') {
    // Basic key/IV setup (pad or truncate to 16 bytes for simplicity)
    let key = stringToBytesAndPad(keyStr).slice(0, 16);
    let iv = mode === 'CBC' ? stringToBytesAndPad(ivStr).slice(0, 16) : null;
    let msgBytes = stringToBytesAndPad(message);
    
    let blocks = [];
    for(let i=0; i<msgBytes.length; i+=16) {
        blocks.push(msgBytes.slice(i, i+16));
    }
    
    let aes = new AES128Visualizer(key);
    let allTraces = [];
    let prevCipher = iv;
    let ciphertext = [];
    
    blocks.forEach((block, idx) => {
        let blockTrace = { blockIndex: idx, originalBlock: [...block], traces: [] };
        
        let blockToEncrypt = block;
        if (mode === 'CBC') {
            blockTrace.traces.push({
                name: 'CBC XOR',
                round: 0,
                state: aes.bufferToState(block),
                description: `CBC Mode: Before encryption, the plaintext block is XORed with the ${idx === 0 ? 'Initialization Vector (IV)' : 'previous ciphertext block'} shown below.`,
                roundKey: aes.bufferToState(prevCipher)
            });
            blockToEncrypt = xorBytes(block, prevCipher);
            blockTrace.traces.push({
                name: 'CBC XOR Result',
                round: 0,
                state: aes.bufferToState(blockToEncrypt),
                description: "Result of the XOR operation. This modified block is what actually enters the AES encryption algorithm.",
                roundKey: aes.bufferToState(prevCipher)
            });
        }
        
        let res = aes.encryptBlock(blockToEncrypt);
        blockTrace.traces = blockTrace.traces.concat(res.trace);
        allTraces.push(blockTrace);
        
        prevCipher = res.cipherBytes;
        ciphertext.push(...res.cipherBytes);
    });
    
    return { ciphertext, allTraces, key, iv };
}
