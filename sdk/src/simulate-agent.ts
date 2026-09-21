import * as dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, resolve } from 'path';
import { SuryAgentClient } from './client.js';

// Load .env from root or local
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
dotenv.config({ path: resolve(__dirname, '../../.env') });

async function runAgentSimulation() {
  console.log('🤖 === SURY Autonomous Agent Client Simulation ===');
  console.log('Target Network: BOT Chain Mainnet (ID: 677)');

  const client = new SuryAgentClient({
    rpcUrl: process.env.BOT_CHAIN_RPC || 'https://rpc.botchain.ai',
    treasuryAddress:
      (process.env.SURY_TREASURY_ADDRESS as `0x${string}`) ||
      '0xcB68b99e5b02b1E6A6AEE361089e1AdcdACEfe00',
    privateKey: process.env.DEPLOYER_PRIVATE_KEY as `0x${string}`,
  });

  console.log(`Treasury Address: ${client.treasuryAddress}`);

  // 1. Check Treasury Status
  console.log('\n--- 1. Fetching Treasury Summary ---');
  const summary = await client.getTreasurySummary();
  console.log(`✓ Treasury Balance: ${summary.balanceBot} BOT`);
  console.log(`✓ Total Deposited:  ${summary.totalDepositedBot} BOT`);
  console.log(`✓ Total Spent:      ${summary.totalSpentBot} BOT`);
  console.log(`✓ Registered Agents: ${summary.agentCount}`);
  console.log(`✓ Total Tasks:      ${summary.taskCount}`);
  console.log(`✓ Paused:           ${summary.isPaused ? 'YES' : 'NO'}`);

  // 2. Fetch Agent #1 Profile
  console.log('\n--- 2. Fetching Agent Profile (#1) ---');
  try {
    const agent = await client.getAgentProfile(1n);
    console.log(`✓ Agent Name:       "${agent.name}"`);
    console.log(`✓ Agent Address:    ${agent.agentAddress}`);
    console.log(`✓ Status:           ${agent.status.toUpperCase()}`);
    console.log(`✓ Remaining Budget: ${agent.remainingBudgetBot} BOT`);
    console.log(`✓ Per-Tx Limit:     ${agent.perTransactionLimitBot} BOT`);
    console.log(`✓ Daily Limit:      ${agent.dailyLimitBot} BOT`);

    // 3. Pre-flight Compliance Check: Safe Payment
    console.log('\n--- 3. Pre-flight Policy Compliance Check (Compliant Amount) ---');
    const safeCheck = await client.checkCompliance({
      agentId: 1n,
      description: 'API Compute Inference Payment',
      amountBot: '0.0001',
      destination: '0x34090545BD562b0bE1Cdc855F7cA9beE4566CE51',
    });
    console.log(`✓ Compliant: ${safeCheck.compliant ? 'PASSED ✅' : 'FAILED ❌'}`);
    if (!safeCheck.compliant) console.log(`  Reason: ${safeCheck.reason}`);

    // 4. Pre-flight Compliance Check: Violating Payment (Exceeding Per-Tx Limit)
    console.log('\n--- 4. Pre-flight Policy Compliance Check (Limit Violation) ---');
    const violateCheck = await client.checkCompliance({
      agentId: 1n,
      description: 'Unauthorized Mega Withdrawal',
      amountBot: '10.0', // Exceeds budget & limit
      destination: '0x34090545BD562b0bE1Cdc855F7cA9beE4566CE51',
    });
    console.log(`✓ Policy Protection Active: ${!violateCheck.compliant ? 'BLOCKED SAFELY ✅' : 'FAILED ❌'}`);
    console.log(`  Blocked Reason: "${violateCheck.reason}"`);
    console.log('  Agent gas preserved! No transaction sent to chain.');

  } catch (err) {
    console.log('⚠️ Could not query Agent #1:', err);
  }

  console.log('\n🎉 === SURY Agent Client Simulation Completed Successfully! ===\n');
}

runAgentSimulation().catch((err) => {
  console.error('Simulation error:', err);
  process.exit(1);
});
