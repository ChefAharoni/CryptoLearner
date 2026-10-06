class SHA256Visualizer {
    constructor() {
        this.trace = [];
        this.K = [
            0x428a2f98, 0x71374491, 0xb5c0fbcf, 0xe9b5dba5, 0x3956c25b, 0x59f111f1, 0x923f82a4, 0xab1c5ed5,
            0xd807aa98, 0x12835b01, 0x243185be, 0x550c7dc3, 0x72be5d74, 0x80deb1fe, 0x9bdc06a7, 0xc19bf174,
            0xe49b69c1, 0xefbe4786, 0x0fc19dc6, 0x240ca1cc, 0x2de92c6f, 0x4a7484aa, 0x5cb0a9dc, 0x76f988da,
            0x983e5152, 0xa831c66d, 0xb00327c8, 0xbf597fc7, 0xc6e00bf3, 0xd5a79147, 0x06ca6351, 0x14292967,
            0x27b70a85, 0x2e1b2138, 0x4d2c6dfc, 0x53380d13, 0x650a7354, 0x766a0abb, 0x81c2c92e, 0x92722c85,
            0xa2bfe8a1, 0xa81a664b, 0xc24b8b70, 0xc76c51a3, 0xd192e819, 0xd6990624, 0xf40e3585, 0x106aa070,
            0x19a4c116, 0x1e376c08, 0x2748774c, 0x34b0bcb5, 0x391c0cb3, 0x4ed8aa4a, 0x5b9cca4f, 0x682e6ff3,
            0x748f82ee, 0x78a5636f, 0x84c87814, 0x8cc70208, 0x90befffa, 0xa4506ceb, 0xbef9a3f7, 0xc67178f2
        ];
        this.H_init = [
            0x6a09e667, 0xbb67ae85, 0x3c6ef372, 0xa54ff53a, 
            0x510e527f, 0x9b05688c, 0x1f83d9ab, 0x5be0cd19
        ];
    }

    addTrace(name, round, vars, W, description, activeW = null) {
        this.trace.push({
            name,
            round,
            vars: { ...vars },
            W: [...W],
            description,
            activeW
        });
    }

    ROTR(n, x) {
        return (x >>> n) | (x << (32 - n));
    }
    SHR(n, x) {
        return (x >>> n);
    }
    Ch(x, y, z) {
        return (x & y) ^ (~x & z);
    }
    Maj(x, y, z) {
        return (x & y) ^ (x & z) ^ (y & z);
    }
    Sigma0(x) {
        return this.ROTR(2, x) ^ this.ROTR(13, x) ^ this.ROTR(22, x);
    }
    Sigma1(x) {
        return this.ROTR(6, x) ^ this.ROTR(11, x) ^ this.ROTR(25, x);
    }
    sigma0(x) {
        return this.ROTR(7, x) ^ this.ROTR(18, x) ^ this.SHR(3, x);
    }
    sigma1(x) {
        return this.ROTR(17, x) ^ this.ROTR(19, x) ^ this.SHR(10, x);
    }
    safeAdd(x, y) {
        let lsw = (x & 0xFFFF) + (y & 0xFFFF);
        let msw = (x >> 16) + (y >> 16) + (lsw >> 16);
        return (msw << 16) | (lsw & 0xFFFF);
    }

    padMessage(msgStr) {
        let msg = [];
        for (let i = 0; i < msgStr.length; i++) {
            msg.push(msgStr.charCodeAt(i));
        }
        
        let bitLen = msg.length * 8;
        msg.push(0x80); // append 1 bit (0x80 in byte)
        
        while ((msg.length % 64) !== 56) {
            msg.push(0x00);
        }
        
        // Append length as 64-bit big-endian (we assume length fits in 32 bits for this simple tool)
        msg.push(0, 0, 0, 0); // High 32 bits
        msg.push((bitLen >>> 24) & 0xff, (bitLen >>> 16) & 0xff, (bitLen >>> 8) & 0xff, bitLen & 0xff);
        
        return msg;
    }

    processChunks(msgBytes) {
        let H = [...this.H_init];
        let allTraces = [];
        
        let chunksCount = msgBytes.length / 64;
        
        for (let i = 0; i < chunksCount; i++) {
            this.trace = [];
            let chunk = msgBytes.slice(i * 64, (i + 1) * 64);
            
            // Build W
            let W = new Array(64).fill(0);
            for (let t = 0; t < 16; t++) {
                W[t] = (chunk[t*4] << 24) | (chunk[t*4+1] << 16) | (chunk[t*4+2] << 8) | (chunk[t*4+3]);
            }
            
            let vars = { a: H[0], b: H[1], c: H[2], d: H[3], e: H[4], f: H[5], g: H[6], h: H[7] };
            
            this.addTrace(
                "Message Padding & Prep", "padding", vars, W, 
                `Chunk ${i+1}: The message is padded with a '1' bit, zeros, and its original length, then broken into 512-bit chunks. The first 16 words (W[0] to W[15]) are loaded from this chunk.`
            );

            for (let t = 16; t < 64; t++) {
                W[t] = this.safeAdd(this.safeAdd(this.sigma1(W[t-2]), W[t-7]), this.safeAdd(this.sigma0(W[t-15]), W[t-16]));
            }
            
            this.addTrace(
                "Message Schedule Expansion", "padding", vars, W, 
                `The remaining words W[16] to W[63] are generated using logical functions (sigma0, sigma1) on the previous words to ensure robust diffusion.`
            );

            for (let t = 0; t < 64; t++) {
                let skip = t > 2 && t < 63;
                let T1 = this.safeAdd(this.safeAdd(this.safeAdd(this.safeAdd(vars.h, this.Sigma1(vars.e)), this.Ch(vars.e, vars.f, vars.g)), this.K[t]), W[t]);
                let T2 = this.safeAdd(this.Sigma0(vars.a), this.Maj(vars.a, vars.b, vars.c));
                
                vars.h = vars.g;
                vars.g = vars.f;
                vars.f = vars.e;
                vars.e = this.safeAdd(vars.d, T1);
                vars.d = vars.c;
                vars.c = vars.b;
                vars.b = vars.a;
                vars.a = this.safeAdd(T1, T2);
                
                if (!skip) {
                    this.addTrace(
                        `Compression Round ${t}`, t, vars, W, 
                        `Round ${t}: The working variables are updated. 'e' and 'a' receive complex non-linear combinations involving W[${t}], a round constant, and logical functions (Choice, Majority).`,
                        t // active W index
                    );
                } else if (t === 62) {
                     this.addTrace(
                        `Compression Rounds 3-62`, "skip", vars, W, 
                        `Rounds 3 through 62 apply the exact same mathematical shifts and logical operations. We fast-forward through them.`
                    );
                }
            }

            H[0] = this.safeAdd(H[0], vars.a);
            H[1] = this.safeAdd(H[1], vars.b);
            H[2] = this.safeAdd(H[2], vars.c);
            H[3] = this.safeAdd(H[3], vars.d);
            H[4] = this.safeAdd(H[4], vars.e);
            H[5] = this.safeAdd(H[5], vars.f);
            H[6] = this.safeAdd(H[6], vars.g);
            H[7] = this.safeAdd(H[7], vars.h);
            
            vars = { a: H[0], b: H[1], c: H[2], d: H[3], e: H[4], f: H[5], g: H[6], h: H[7] };
            this.addTrace(
                `Intermediate Hash Update`, "hash", vars, W, 
                `After 64 rounds, the compressed variables (a-h) are added back to the intermediate hash values (H0-H7).`
            );
            
            allTraces.push({ chunkIndex: i, traces: this.trace });
        }
        
        return allTraces;
    }
}

function processSHA256Message(msgStr) {
    let viz = new SHA256Visualizer();
    let paddedBytes = viz.padMessage(msgStr);
    let allTraces = viz.processChunks(paddedBytes);
    return allTraces;
}
