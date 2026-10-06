# CryptoLearner: AES-128 Visualizer

An educational tool designed for Security students to visualize the inner workings of the Advanced Encryption Standard (AES-128).

## Features

- **Step-by-Step Visualization:** Watch the encryption process unfold in slow motion.
- **State Matrix Display:** View the 4x4 state grid in both Hexadecimal and ASCII formats.
- **Detailed Explanations:** Each step (SubBytes, ShiftRows, MixColumns, AddRoundKey) is explained as it happens.
- **Block Cipher Modes:** Supports both ECB (Electronic Codebook) and CBC (Cipher Block Chaining) with explanations of their differences and ECB's weaknesses.
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

This repository is structured to eventually accommodate additional cryptographic algorithms:
- AES-192, AES-256
- Hashing Algorithms (SHA-256, MD5)
- Additional cipher modes (GCM, CTR)
