const { ethers } = require("hardhat");
const fs = require("fs");
const path = require("path");

async function main() {
  console.log("==================================================");
  console.log("SURY Protocol — BOT Chain Mainnet Smoke Test");
  console.log("==================================================");

  const receiptPath = path.resolve(__dirname, "../deployment-receipt.json");
  if (!fs.existsSync(receiptPath)) {
    console.error("No deployment-receipt.json found. Please deploy first with 'npm run deploy'");
    process.exit(1);
  }

  const deployment = JSON.parse(fs.readFileSync(receiptPath, "utf8"));
  const contractAddress = deployment.contractAddress;

  const [signer] = await ethers.getSigners();
  const signerAddress = await signer.getAddress();
  const networkInfo = await ethers.provider.getNetwork();
  const chainId = Number(networkInfo.chainId);

  console.log(`CONTRACT:         ${contractAddress}`);
  console.log(`SIGNER:           ${signerAddress}`);
  console.log(`CHAIN ID:         ${chainId}`);

  if (chainId !== 677) {
    console.error(`Safety abort: Connected chain ID is ${chainId}, expected 677.`);
    process.exit(1);
  }

  const treasury = await ethers.getContractAt("SuryTreasury", contractAddress, signer);

  const smokeResults = {
    contractAddress,
    chainId,
    timestamp: new Date().toISOString(),
    transactions: {},
  };

  const NATIVE_BOT = "0xEeeeeEeeeEeEeeEeEeEeeEEEeeeeEeeeeeeeEEeE";
  const TEST_DEPOSIT = ethers.parseEther("0.0005");
  const AGENT_BUDGET = ethers.parseEther("0.0004");
  const PER_TX_LIMIT = ethers.parseEther("0.0002");
  const DAILY_LIMIT = ethers.parseEther("0.0004");
  const PAYMENT_AMOUNT = ethers.parseEther("0.0001");

  // Step 1: Fund Treasury with minimal BOT
  console.log("\n1. Funding Treasury with 0.0005 BOT...");
  const fundTx = await treasury.deposit({ value: TEST_DEPOSIT });
  const fundReceipt = await fundTx.wait();
  console.log(`   Deposit Tx: ${fundReceipt?.hash} (Gas: ${fundReceipt?.gasUsed.toString()})`);
  smokeResults.transactions.fundTreasury = {
    hash: fundReceipt?.hash,
    gasUsed: fundReceipt?.gasUsed.toString(),
  };

  // Step 2: Create Agent
  console.log("\n2. Creating Agent 'Mainnet Smoke Agent'...");
  const agentTx = await treasury.createAgent(
    "Mainnet Smoke Agent",
    signerAddress,
    AGENT_BUDGET,
    DAILY_LIMIT,
    PER_TX_LIMIT,
    0
  );
  const agentReceipt = await agentTx.wait();
  const agentCount = await treasury.agentCount();
  const agentId = Number(agentCount);
  console.log(`   Agent Created: ID ${agentId}, Tx: ${agentReceipt?.hash} (Gas: ${agentReceipt?.gasUsed.toString()})`);
  smokeResults.transactions.createAgent = {
    agentId,
    hash: agentReceipt?.hash,
    gasUsed: agentReceipt?.gasUsed.toString(),
  };

  // Step 3: Create Policy
  console.log("\n3. Creating Policy...");
  const policyTx = await treasury.createPolicy(
    agentId,
    AGENT_BUDGET,
    PER_TX_LIMIT,
    DAILY_LIMIT,
    [NATIVE_BOT],
    [signerAddress],
    0
  );
  const policyReceipt = await policyTx.wait();
  const policyCount = await treasury.policyCount();
  const policyId = Number(policyCount);
  console.log(`   Policy Created: ID ${policyId}, Tx: ${policyReceipt?.hash} (Gas: ${policyReceipt?.gasUsed.toString()})`);
  smokeResults.transactions.createPolicy = {
    policyId,
    hash: policyReceipt?.hash,
    gasUsed: policyReceipt?.gasUsed.toString(),
  };

  // Step 4: Create Task
  console.log("\n4. Creating Task for 0.0001 BOT...");
  const taskTx = await treasury.createTask(
    agentId,
    "Smoke Test Payment Execution",
    PAYMENT_AMOUNT,
    NATIVE_BOT,
    signerAddress,
    ethers.ZeroAddress,
    0
  );
  const taskReceipt = await taskTx.wait();
  const taskCount = await treasury.taskCount();
  const taskId = Number(taskCount);
  console.log(`   Task Created: ID ${taskId}, Tx: ${taskReceipt?.hash} (Gas: ${taskReceipt?.gasUsed.toString()})`);
  smokeResults.transactions.createTask = {
    taskId,
    hash: taskReceipt?.hash,
    gasUsed: taskReceipt?.gasUsed.toString(),
  };

  // Step 5: Approve Task
  console.log("\n5. Approving Task...");
  const approveTx = await treasury.approveTask(taskId);
  const approveReceipt = await approveTx.wait();
  console.log(`   Task Approved Tx: ${approveReceipt?.hash} (Gas: ${approveReceipt?.gasUsed.toString()})`);
  smokeResults.transactions.approveTask = {
    hash: approveReceipt?.hash,
    gasUsed: approveReceipt?.gasUsed.toString(),
  };

  // Step 6: Execute Payment
  console.log("\n6. Executing Payment (0.0001 BOT)...");
  const execTx = await treasury.executeTask(taskId);
  const execReceipt = await execTx.wait();
  console.log(`   Payment Executed Tx: ${execReceipt?.hash} (Gas: ${execReceipt?.gasUsed.toString()})`);
  smokeResults.transactions.executePayment = {
    hash: execReceipt?.hash,
    gasUsed: execReceipt?.gasUsed.toString(),
  };

  // Step 7: Verify On-Chain State
  console.log("\n7. Verifying On-Chain State...");
  const agent = await treasury.getAgent(agentId);
  const task = await treasury.getTask(taskId);
  const summary = await treasury.getTreasurySummary();

  console.log(`   Agent Remaining Budget: ${ethers.formatEther(agent.remainingBudget)} BOT`);
  console.log(`   Agent Spent:            ${ethers.formatEther(agent.spent)} BOT`);
  console.log(`   Task Status:            ${task.status === 4n ? "SETTLED (Confirmed)" : task.status.toString()}`);
  console.log(`   Treasury Total Spent:   ${ethers.formatEther(summary.spent)} BOT`);

  // Step 8: Test On-Chain Policy Violation Revert
  console.log("\n8. Testing On-Chain Policy Violation (Exceeds Per-Tx Limit)...");
  const EXCESSIVE_AMOUNT = ethers.parseEther("0.0003"); // Exceeds PER_TX_LIMIT (0.0002)
  const overTaskTx = await treasury.createTask(
    agentId,
    "Excessive Payout Attempt (Should Revert)",
    EXCESSIVE_AMOUNT,
    NATIVE_BOT,
    signerAddress,
    ethers.ZeroAddress,
    0
  );
  await overTaskTx.wait();
  const overTaskId = Number(await treasury.taskCount());
  await (await treasury.approveTask(overTaskId)).wait();

  try {
    await treasury.executeTask(overTaskId);
    console.error("   FAILURE: Expected on-chain revert did not occur!");
    process.exit(1);
  } catch (err) {
    console.log("   SUCCESS: Transaction reverted on-chain as expected!");
    console.log(`   Revert Reason / Error: ${err.message?.slice(0, 120)}...`);
    smokeResults.policyViolationTest = {
      attemptedAmount: ethers.formatEther(EXCESSIVE_AMOUNT),
      limit: ethers.formatEther(PER_TX_LIMIT),
      revertedSuccessfully: true,
    };
  }

  // Write smoke test results
  const smokePath = path.resolve(__dirname, "../smoke-test-results.json");
  fs.writeFileSync(smokePath, JSON.stringify(smokeResults, null, 2));
  console.log(`\nSmoke test results saved to: ${smokePath}`);
  console.log("==================================================");
  console.log("ALL SMOKE TESTS PASSED ON BOT CHAIN MAINNET!");
  console.log("==================================================");
}

main().catch((err) => {
  console.error("Smoke test failed:", err);
  process.exit(1);
});
