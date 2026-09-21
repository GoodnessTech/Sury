# @sury/agent-sdk

Lightweight autonomous agent client SDK for **SURY — Agent Treasury OS** on **BOT Chain Mainnet** (Chain ID: 677).

## Features

- **Treasury Integration**: Query protocol state, total liquidity, and spending metrics.
- **Agent Self-Inspection**: Read live agent budget, daily spending counters, and per-transaction limits.
- **Pre-flight Policy Verification**: Validate tasks against on-chain policy constraints locally before spending gas.
- **Task Proposal & Settlement**: Programmatically propose tasks, await operator approval, and execute autonomous settlements.

## Installation

```bash
npm install @sury/agent-sdk viem
```

## Quick Start

```typescript
import { SuryAgentClient } from '@sury/agent-sdk';

const client = new SuryAgentClient({
  rpcUrl: 'https://rpc.botchain.ai',
  treasuryAddress: '0xcB68b99e5b02b1E6A6AEE361089e1AdcdACEfe00',
  privateKey: '0x...', // Agent private key (optional for read-only)
});

// 1. Check Agent limits & remaining budget
const agent = await client.getAgentProfile(1n);
console.log(`Remaining Budget: ${agent.remainingBudgetBot} BOT`);

// 2. Pre-validate before submitting transaction
const compliance = await client.checkCompliance({
  agentId: 1n,
  description: 'Inference API payment',
  amountBot: '0.0001',
  destination: '0xRecipientAddress...',
});

if (!compliance.compliant) {
  console.error(`Task rejected by policy: ${compliance.reason}`);
  return;
}

// 3. Submit task on-chain
const { taskId, transactionHash } = await client.proposeTask({
  agentId: 1n,
  description: 'Inference API payment',
  amountBot: '0.0001',
  destination: '0xRecipientAddress...',
});
console.log(`Task #${taskId} proposed! Tx: ${transactionHash}`);

// 4. Wait for operator approval & trigger settlement
const approvedTask = await client.waitForApproval(taskId);
if (approvedTask.status === 'approved') {
  const receipt = await client.executeTask(taskId);
  console.log(`Payment settled! Tx: ${receipt.transactionHash}`);
}
```

## Running the Simulation

```bash
cd sdk
npm install
npm run simulate
```
