# SURY — Autonomous Agent Treasury Operating System

> **Protocol Contract on BOT Chain Mainnet (Chain ID 677):**  
> [`0xcB68b99e5b02b1E6A6AEE361089e1AdcdACEfe00`](https://scan.botchain.ai/address/0xcB68b99e5b02b1E6A6AEE361089e1AdcdACEfe00)

SURY is an **On-Chain Agent Treasury Operating System** built for autonomous AI agents on BOT Chain. It enforces the fundamental financial primitive:

$$\text{Treasury} \longrightarrow \text{Agent} \longrightarrow \text{Policy} \longrightarrow \text{Task} \longrightarrow \text{Payment} \longrightarrow \text{Receipt}$$

---

## 📁 Repository Structure

```
.
├── contracts/               # Solidity smart contracts & Hardhat test suite
│   ├── contracts/
│   │   └── SuryTreasury.sol # Unified Treasury, Agent Registry, Policy Engine & Settlement
│   ├── scripts/             # Deploy & on-chain smoke test scripts
│   └── test/                # Hardhat unit tests (18/18 passing)
│
├── Sury Frontend/           # Production React 18 + Vite + Tailwind CSS Web App
│   ├── src/
│   │   ├── services/        # Live viem blockchain client & EVM wallet integration
│   │   ├── store/           # SuryContext state provider & 15s auto-sync
│   │   ├── components/      # UI primitives, visual analytics & Toast notifications
│   │   └── pages/           # Overview, Treasury, Agents, Policies, Tasks, Receipts, Activity
│
└── sdk/                     # @sury/agent-sdk TypeScript library for AI Bots
    ├── src/
    │   ├── client.ts        # SuryAgentClient for programmatic task proposals
    │   └── simulate-agent.ts# Live on-chain bot test runner
    └── README.md
```

---

## ⚙️ Quick Start

### 1. Run the Frontend Dashboard
```bash
cd "Sury Frontend"
npm install
npm run dev
```
Open [http://localhost:5173](http://localhost:5173) in your browser.

### 2. Run the Smart Contract Tests
```bash
cd contracts
npm install
npm test
```

### 3. Run the Autonomous Agent Simulation
```bash
cd sdk
npm install
npm run simulate
```

---

## 🚀 Deployment

### Deploying to GitHub
1. Initialize git and commit files (the included `.gitignore` protects your `.env` private keys):
   ```bash
   git init
   git add .
   git commit -m "feat: Initial SURY Treasury OS release"
   git branch -M main
   git remote add origin https://github.com/<your-username>/sury.git
   git push -u origin main
   ```

### Deploying to Vercel
1. Push your repository to GitHub.
2. Go to [Vercel](https://vercel.com) and click **"Add New Project"**.
3. Select your `sury` repository.
4. Add the following environment variables in the Vercel project settings:
   * `VITE_SURY_TREASURY_ADDRESS` = `0xcB68b99e5b02b1E6A6AEE361089e1AdcdACEfe00`
   * `VITE_BOT_CHAIN_RPC` = `https://rpc.botchain.ai`
   * `VITE_BOT_CHAIN_EXPLORER` = `https://scan.botchain.ai`
5. Click **Deploy**. The included `vercel.json` will automatically build the application.
