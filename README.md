# CryptoLearner: Interactive Cryptography Visualizers

An educational suite of step-by-step visualizers designed for Security students to learn the inner workings of fundamental cryptographic algorithms.

## Included Algorithms

### 1. AES-128 (Advanced Encryption Standard)
- **Block Cipher Modes:** Support for ECB (Electronic Codebook) and CBC (Cipher Block Chaining).
- **Core Operations:** Visualizes SubBytes (S-Box), ShiftRows, MixColumns (Galois Field math), and AddRoundKey.
- **Key Expansion:** Demonstrates how the master key is expanded and traces the exact Round Keys being XORed against the state matrix.

### 2. SHA-256 (Secure Hash Algorithm)
- **Data Padding:** Shows how arbitrary data is padded with a '1' bit, zeros, and a 64-bit big-endian length before being split into 512-bit chunks.
- **Message Schedule Expansion:** Visualizes the expansion of the initial 16 words into the 64-word array `W[0...63]`.
- **Compression Rounds:** Animates the non-linear math (Choice and Majority functions) altering the 8 working variables (`a` through `h`) across 64 rounds.

### 3. MD5 (Message-Digest Algorithm 5)
- **Legacy Architecture:** Demonstrates MD5's specific little-endian padding architecture.
- **Compression:** Steps through the 4 core rounds (64 operations) applying the non-linear logic functions (F, G, H, I) against the 4 working variables (A, B, C, D) using the 16-word message block `M[0...15]`.

## Features

- **Dashboard:** A central landing page to navigate between different algorithm visualizations.
- **Step-by-Step Animations:** Watch the encryption and hashing processes unfold in slow motion with choreographed CSS/DOM animations.
- **Adjustable Speed:** A dynamic slider allows users to slow down or speed up the animations (from 0.25x to 3.0x speed).
- **State Matrix Display:** View grids in Hexadecimal and ASCII formats.
- **Detailed Explanations:** Each operational step is explained in English as it happens.
- **Interactive Controls:** Play, pause, skip, go back, or jump to specific rounds.

## Hosting on GitHub Pages

This project is a static website, making it incredibly easy to host on GitHub Pages:

1. Push this repository to GitHub.
2. Go to the repository's **Settings**.
3. Navigate to **Pages** on the left sidebar.
4. Under **Build and deployment**, select **Deploy from a branch**.
5. Select the `main` branch (or whichever branch you are using) and click **Save**.
6. GitHub will automatically build and deploy the site. Your visualizer will be live at `https://<your-username>.github.io/CryptoLearner/` in a few minutes.

## Future Expansion

This repository is structured to accommodate additional cryptographic algorithms:
- AES-192, AES-256
- Additional cipher modes (GCM, CTR)
- Public Key Cryptography (RSA, ECC basic principles)
