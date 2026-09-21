# SURY — Antigravity Integration Guide

SURY is an **Agent Treasury OS** for autonomous agents on **BOT Chain Mainnet** (Chain ID 677). This document explains the frontend architecture and exactly where to connect the smart contracts.

## 1. Frontend Architecture

```
src/
├── config.ts              # BOT Chain config + contract address env vars
├── types.ts               # All TypeScript domain interfaces
├── services/
│   ├── walletService.ts   # EVM wallet integration boundary (injected provider)
│   └── mockDataService.ts # Mock data provider (returns empty — replace with blockchain reads)
├── store/
│   └── SuryContext.tsx    # Global state: wallet, data, transaction states
├── components/
│   ├── ui.tsx             # Reusable UI primitives (WalletButton, MetricCard, EmptyState, etc.)
│   └── Sidebar.tsx        # Navigation shell
└── pages/
    ├── OverviewPage.tsx   # Dashboard
    ├── TreasuryPage.tsx
    ├── AgentsPage.tsx
    ├── PoliciesPage.tsx
    ├── TasksPage.tsx
    ├── ReceiptsPage.tsx
    └── ActivityPage.tsx
```

## 2. Main Routes

| Route       | Page             | Purpose                                      |
|-------------|------------------|----------------------------------------------|
| overview    | OverviewPage     | Dashboard with metrics, agent/task summaries |
| treasury    | TreasuryPage     | Treasury balance, deposit/withdraw/pause     |
| agents      | AgentsPage       | Agent list, create agent, view agent          |
| policies    | PoliciesPage    | Policy list, create/edit/pause policy        |
| tasks       | TasksPage        | Task list, create/approve/execute task       |
| receipts    | ReceiptsPage     | Settlement receipts with tx hash + explorer   |
| activity    | ActivityPage     | On-chain event stream                         |

## 3. Data Types

All types are in `src/types.ts`. Key interfaces:

- `Treasury` — balance, availableBalance, totalDeposited, totalSpent, todaySpent, status
- `Agent` — name, address, status, assignedBudget, remainingBudget, spent, dailyLimit, policyId, taskCount
- `Policy` — agentId, budget, perTransactionLimit, dailyLimit, approvedTokens[], approvedTargets[], expiry, status
- `Task` — agentId, description, amount, token, destination, target, policyId, status, createdAt, expiry
- `Payment` — taskId, amount, token, recipient, status, transactionHash
- `Receipt` — taskId, agentId, treasuryId, amount, token, recipient, timestamp, policyId, transactionHash
- `Activity` — type, label, status, createdAt, transactionHash
- `WalletState` — status, address, chainId, balance, symbol
- `TransactionState` — status, hash, error

## 4. Mock Data Location

`src/services/mockDataService.ts` — implements `SuryDataProvider`. Currently returns empty/null for all queries. This is the **only** mock data source. No component imports mock data directly.

## 5. Blockchain Integration Boundaries

### Data Provider
Replace `mockDataProvider` in `src/store/SuryContext.tsx` with a `BlockchainDataProvider` that implements `SuryDataProvider` using viem/wagmi contract reads.

### Wallet Service
`src/services/walletService.ts` — `WalletService` interface. Current implementation uses `window.ethereum` (injected EVM wallet). Compatible with wagmi/viem. Replace or wrap as needed.

## 6. Wallet Integration Boundary

- `WalletService.connect()` — calls `eth_requestAccounts`
- `WalletService.switchToBotChain()` — calls `wallet_switchEthereumChain` / `wallet_addEthereumChain` for Chain ID 677
- `WalletService.signAndSendTransaction()` — calls `eth_sendTransaction`
- Wallet state flows through `SuryContext` via `onWalletChange` callback
- UI states: disconnected → connected → wrong-network → switching

## 7. Contract Configuration

`src/config.ts` reads contract addresses from environment variables:

```env
VITE_SURY_TREASURY_ADDRESS=0x...
VITE_SURY_FACTORY_ADDRESS=0x...
VITE_SURY_POLICY_ADDRESS=0x...
```

Add these to `.env` after deploying contracts to BOT Chain Mainnet.

## 8. Expected Contract Interfaces

The frontend expects these contract interactions (implement as needed):

**Treasury Contract:**
- `getBalance()` → treasury balance
- `deposit(amount)` → fund treasury
- `withdraw(amount)` → withdraw from treasury
- `pause()` / `unpause()` → emergency controls
- `getTotalSpent()` / `getTodaySpent()` → spending metrics

**Agent/Factory Contract:**
- `createAgent(name)` → create new agent
- `getAgents()` → list agents
- `getAgent(id)` → agent details
- `pauseAgent(id)` / `unpauseAgent(id)`

**Policy Contract:**
- `createPolicy(agentId, budget, perTxLimit, dailyLimit, tokens[], targets[], expiry)` → create policy
- `getPolicies()` → list policies
- `pausePolicy(id)` / `editPolicy(id, ...)`

**Task Contract:**
- `createTask(agentId, description, amount, token, destination, target, expiry)` → create task
- `approveTask(id)` / `rejectTask(id)`
- `executeTask(id)` → execute payment, returns tx hash
- `getTasks()` → list tasks

**Receipt/Event Reading:**
- Read `PaymentExecuted`, `TaskCreated`, `AgentCreated`, `TreasuryFunded`, etc. events from the contract to populate Activity and Receipts pages.

## 9. Components Expecting Live Blockchain Data

All pages read from `SuryContext` which calls the data provider:
- OverviewPage: treasury, agents, tasks, receipts, activity
- TreasuryPage: treasury
- AgentsPage: agents
- PoliciesPage: policies
- TasksPage: tasks
- ReceiptsPage: receipts
- ActivityPage: activity

## 10. Mock Providers to Replace

Only one: `mockDataProvider` in `src/store/SuryContext.tsx`. Replace with your `BlockchainDataProvider` implementation.

## 11. Environment Variables

```env
VITE_SURY_TREASURY_ADDRESS=0x...   # Treasury contract address
VITE_SURY_FACTORY_ADDRESS=0x...    # Agent factory contract address
VITE_SURY_POLICY_ADDRESS=0x...     # Policy contract address
```

## 12. BOT Chain Mainnet Configuration

```typescript
// src/config.ts
chainId: 677
nativeToken: BOT
rpcUrl: https://rpc.botchain.ai
explorerUrl: https://scan.botchain.ai
```

## Transaction States

The UI tracks these transaction states (see `TransactionState` in types.ts):
idle → awaiting-signature → submitted → pending → confirmed → failed → rejected → wrong-network → insufficient-gas

Connect these to real transaction lifecycle events from viem/wagmi.
