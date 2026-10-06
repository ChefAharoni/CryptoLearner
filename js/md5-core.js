class MD5Visualizer {
    constructor() {
        this.trace = [];
        this.S = [
            7, 12, 17, 22,  7, 12, 17, 22,  7, 12, 17, 22,  7, 12, 17, 22,
            5,  9, 14, 20,  5,  9, 14, 20,  5,  9, 14, 20,  5,  9, 14, 20,
            4, 11, 16, 23,  4, 11, 16, 23,  4, 11, 16, 23,  4, 11, 16, 23,
            6, 10, 15, 21,  6, 10, 15, 21,  6, 10, 15, 21,  6, 10, 15, 21
        ];
        this.K = new Array(64);
        for (let i = 0; i < 64; i++) {
            this.K[i] = Math.floor(4294967296 * Math.abs(Math.sin(i + 1))) | 0;
        }
        
        // Initial state
        this.H_init = [
            0x67452301, 
            0xefcdab89, 
            0x98badcfe, 
            0x10325476
        ];
    }

    addTrace(name, round, vars, M, description, activeM = null) {
        this.trace.push({
            name,
            round,
            vars: { ...vars },
            M: [...M],
            description,
            activeM
        });
    }

    // Helper functions
    ROTL(x, n) {
        return (x << n) | (x >>> (32 - n));
    }
    
    safeAdd(x, y) {
        let lsw = (x & 0xFFFF) + (y & 0xFFFF);
        let msw = (x >> 16) + (y >> 16) + (lsw >> 16);
        return (msw << 16) | (lsw & 0xFFFF);
    }

    F(B, C, D) { return (B & C) | (~B & D); }
    G(B, C, D) { return (B & D) | (C & ~D); }
    H(B, C, D) { return B ^ C ^ D; }
    I(B, C, D) { return C ^ (B | ~D); }

    padMessage(msgStr) {
        let msg = [];
        for (let i = 0; i < msgStr.length; i++) {
            msg.push(msgStr.charCodeAt(i));
        }
        
        let bitLen = msg.length * 8;
        msg.push(0x80);
        
        while ((msg.length % 64) !== 56) {
            msg.push(0x00);
        }
        
        // MD5 uses little-endian for the 64-bit length
        msg.push(bitLen & 0xff, (bitLen >>> 8) & 0xff, (bitLen >>> 16) & 0xff, (bitLen >>> 24) & 0xff);
        msg.push(0, 0, 0, 0); // High 32 bits (ignored for short messages)
        
        return msg;
    }

    processChunks(msgBytes) {
        let H = [...this.H_init];
        let allTraces = [];
        
        let chunksCount = msgBytes.length / 64;
        
        for (let i = 0; i < chunksCount; i++) {
            this.trace = [];
            let chunk = msgBytes.slice(i * 64, (i + 1) * 64);
            
            // Build M (16 little-endian 32-bit words)
            let M = new Array(16).fill(0);
            for (let t = 0; t < 16; t++) {
                M[t] = (chunk[t*4]) | (chunk[t*4+1] << 8) | (chunk[t*4+2] << 16) | (chunk[t*4+3] << 24);
            }
            
            let vars = { a: H[0], b: H[1], c: H[2], d: H[3] };
            
            this.addTrace(
                "Message Padding & Prep", "padding", vars, M, 
                `Chunk ${i+1}: The message is padded with a '1' bit, zeros, and its original length (in little-endian), then broken into 512-bit chunks. The 16 32-bit words are loaded into M[0] through M[15].`
            );

            for (let t = 0; t < 64; t++) {
                let skip = t > 2 && t < 63;
                let F_res, g;
                
                if (t >= 0 && t <= 15) {
                    F_res = this.F(vars.b, vars.c, vars.d);
                    g = t;
                } else if (t >= 16 && t <= 31) {
                    F_res = this.G(vars.b, vars.c, vars.d);
                    g = (5 * t + 1) % 16;
                } else if (t >= 32 && t <= 47) {
                    F_res = this.H(vars.b, vars.c, vars.d);
                    g = (3 * t + 5) % 16;
                } else if (t >= 48 && t <= 63) {
                    F_res = this.I(vars.b, vars.c, vars.d);
                    g = (7 * t) % 16;
                }
                
                let temp = this.safeAdd(vars.a, this.safeAdd(F_res, this.safeAdd(this.K[t], M[g])));
                temp = this.ROTL(temp, this.S[t]);
                temp = this.safeAdd(vars.b, temp);
                
                vars.a = vars.d;
                vars.d = vars.c;
                vars.c = vars.b;
                vars.b = temp;
                
                let roundNum = Math.floor(t / 16) + 1;
                
                if (!skip) {
                    this.addTrace(
                        `Operation ${t} (Round ${roundNum})`, t, vars, M, 
                        `Op ${t}: A non-linear function is applied to B, C, and D. The result is added to A, the message block M[${g}], and a round constant K[${t}]. The result is rotated and added to B, and variables are shifted.`,
                        g // active M index
                    );
                } else if (t === 62) {
                     this.addTrace(
                        `Operations 3-62`, "skip", vars, M, 
                        `Operations 3 through 62 apply similar logical functions (F, G, H, I) depending on the round, using different pieces of the message block M. We fast-forward through them.`
                    );
                }
            }

            H[0] = this.safeAdd(H[0], vars.a);
            H[1] = this.safeAdd(H[1], vars.b);
            H[2] = this.safeAdd(H[2], vars.c);
            H[3] = this.safeAdd(H[3], vars.d);
            
            vars = { a: H[0], b: H[1], c: H[2], d: H[3] };
            this.addTrace(
                `Intermediate Hash Update`, "hash", vars, M, 
                `After 64 operations, the compressed variables (A-D) are added back to the intermediate hash values.`
            );
            
            allTraces.push({ chunkIndex: i, traces: this.trace });
        }
        
        return allTraces;
    }
}

function processMD5Message(msgStr) {
    let viz = new MD5Visualizer();
    let paddedBytes = viz.padMessage(msgStr);
    let allTraces = viz.processChunks(paddedBytes);
    return allTraces;
}
