const { expect } = require("chai");
const { ethers } = require("hardhat");

describe("SURY Protocol — Smart Contract Test Suite", function () {
  let treasury;
  let owner;
  let agentWallet;
  let recipient1;
  let recipient2;
  let unauthorized;

  const ONE_BOT = ethers.parseEther("1.0");
  const FIVE_BOT = ethers.parseEther("5.0");
  const TEN_BOT = ethers.parseEther("10.0");
  const NATIVE_BOT = "0xEeeeeEeeeEeEeeEeEeEeeEEEeeeeEeeeeeeeEEeE";

  beforeEach(async function () {
    [owner, agentWallet, recipient1, recipient2, unauthorized] = await ethers.getSigners();

    const SuryTreasuryFactory = await ethers.getContractFactory("SuryTreasury");
    treasury = await SuryTreasuryFactory.deploy();
    await treasury.waitForDeployment();
  });

  describe("1. Treasury Core Operations", function () {
    it("should initialize with correct owner, zero balance, and active status", async function () {
      expect(await treasury.owner()).to.equal(owner.address);
      expect(await treasury.paused()).to.equal(false);
      expect(await treasury.totalDeposited()).to.equal(0n);
      expect(await treasury.totalSpent()).to.equal(0n);
    });

    it("should accept deposits via deposit() and direct receive()", async function () {
      await expect(treasury.deposit({ value: TEN_BOT }))
        .to.emit(treasury, "TreasuryFunded");

      expect(await treasury.totalDeposited()).to.equal(TEN_BOT);
      expect(await ethers.provider.getBalance(await treasury.getAddress())).to.equal(TEN_BOT);

      // Direct transfer to contract
      await owner.sendTransaction({
        to: await treasury.getAddress(),
        value: FIVE_BOT,
      });

      expect(await treasury.totalDeposited()).to.equal(ethers.parseEther("15.0"));
    });

    it("should allow owner to withdraw funds", async function () {
      await treasury.deposit({ value: TEN_BOT });

      const balBefore = await ethers.provider.getBalance(recipient1.address);
      await expect(treasury.withdraw(FIVE_BOT, recipient1.address))
        .to.emit(treasury, "TreasuryWithdrawn");

      const balAfter = await ethers.provider.getBalance(recipient1.address);
      expect(balAfter - balBefore).to.equal(FIVE_BOT);
    });

    it("should reject non-owner withdrawals and insufficient balance withdrawals", async function () {
      await treasury.deposit({ value: ONE_BOT });

      await expect(
        treasury.connect(unauthorized).withdraw(ONE_BOT, unauthorized.address)
      ).to.be.revertedWithCustomError(treasury, "Unauthorized");

      await expect(
        treasury.withdraw(TEN_BOT, recipient1.address)
      ).to.be.revertedWithCustomError(treasury, "InsufficientTreasuryBalance");
    });

    it("should allow owner to pause and unpause treasury", async function () {
      await expect(treasury.pause()).to.emit(treasury, "TreasuryPaused");
      expect(await treasury.paused()).to.equal(true);

      await expect(treasury.unpause()).to.emit(treasury, "TreasuryUnpaused");
      expect(await treasury.paused()).to.equal(false);
    });
  });

  describe("2. Agent Lifecycle & Economic Actor Model", function () {
    it("should register an agent with budget, daily limit, and per-tx limit", async function () {
      await expect(
        treasury.createAgent(
          "Research Agent",
          agentWallet.address,
          TEN_BOT,
          FIVE_BOT,
          ONE_BOT,
          0 // no expiry
        )
      )
        .to.emit(treasury, "AgentCreated");

      const agent = await treasury.getAgent(1);
      expect(agent.name).to.equal("Research Agent");
      expect(agent.agentAddress).to.equal(agentWallet.address);
      expect(agent.assignedBudget).to.equal(TEN_BOT);
      expect(agent.remainingBudget).to.equal(TEN_BOT);
      expect(agent.dailyLimit).to.equal(FIVE_BOT);
      expect(agent.perTransactionLimit).to.equal(ONE_BOT);
      expect(agent.status).to.equal(0n); // Active
    });

    it("should allow pausing and unpausing an agent", async function () {
      await treasury.createAgent("Agent 1", agentWallet.address, TEN_BOT, FIVE_BOT, ONE_BOT, 0);

      await treasury.pauseAgent(1);
      let agent = await treasury.getAgent(1);
      expect(agent.status).to.equal(1n); // Paused

      await treasury.unpauseAgent(1);
      agent = await treasury.getAgent(1);
      expect(agent.status).to.equal(0n); // Active
    });
  });

  describe("3. Policy Management", function () {
    it("should create a policy attached to an agent", async function () {
      await treasury.createAgent("Agent 1", agentWallet.address, TEN_BOT, FIVE_BOT, ONE_BOT, 0);

      await expect(
        treasury.createPolicy(
          1,
          TEN_BOT,
          ONE_BOT,
          FIVE_BOT,
          [NATIVE_BOT],
          [recipient1.address],
          0
        )
      ).to.emit(treasury, "PolicyCreated");

      const policy = await treasury.getPolicy(1);
      expect(policy.agentId).to.equal(1n);
      expect(policy.perTransactionLimit).to.equal(ONE_BOT);
      expect(policy.approvedTargets[0]).to.equal(recipient1.address);
    });
  });

  describe("4. Task Lifecycle & On-Chain Policy Enforcement", function () {
    beforeEach(async function () {
      // Fund treasury with 20 BOT
      await treasury.deposit({ value: ethers.parseEther("20.0") });

      // Create Agent with 10 BOT budget, 5 BOT daily limit, 2 BOT per-tx limit
      await treasury.createAgent(
        "Financial Agent",
        agentWallet.address,
        TEN_BOT,
        FIVE_BOT,
        ethers.parseEther("2.0"), // 2 BOT per tx
        0
      );

      // Create Policy approving only native BOT and recipient1
      await treasury.createPolicy(
        1,
        TEN_BOT,
        ethers.parseEther("2.0"),
        FIVE_BOT,
        [NATIVE_BOT],
        [recipient1.address],
        0
      );
    });

    it("should allow owner or agent to create a task", async function () {
      await expect(
        treasury.connect(agentWallet).createTask(
          1,
          "Compute cluster hourly payout",
          ONE_BOT,
          NATIVE_BOT,
          recipient1.address,
          ethers.ZeroAddress,
          0
        )
      )
        .to.emit(treasury, "TaskCreated");

      const task = await treasury.getTask(1);
      expect(task.description).to.equal("Compute cluster hourly payout");
      expect(task.status).to.equal(2n); // Pending
    });

    it("should allow owner to approve task and execute legitimate payment", async function () {
      await treasury.connect(agentWallet).createTask(
        1,
        "Compute cluster payout",
        ONE_BOT,
        NATIVE_BOT,
        recipient1.address,
        ethers.ZeroAddress,
        0
      );

      await expect(treasury.approveTask(1))
        .to.emit(treasury, "TaskApproved");

      const balBefore = await ethers.provider.getBalance(recipient1.address);

      // Execute task
      await expect(treasury.connect(agentWallet).executeTask(1))
        .to.emit(treasury, "PaymentExecuted");

      const balAfter = await ethers.provider.getBalance(recipient1.address);
      expect(balAfter - balBefore).to.equal(ONE_BOT);

      // Verify updated agent metrics
      const agent = await treasury.getAgent(1);
      expect(agent.remainingBudget).to.equal(ethers.parseEther("9.0"));
      expect(agent.spent).to.equal(ONE_BOT);
      expect(agent.dailySpent).to.equal(ONE_BOT);

      // Verify task status is Settled
      const task = await treasury.getTask(1);
      expect(task.status).to.equal(4n); // Settled
    });

    // --- POLICY REVERTS (MANDATORY REQUIREMENT) ---

    it("SECURITY: Should revert if payment exceeds per-transaction limit", async function () {
      // Per tx limit is 2 BOT. Request 3 BOT.
      const THREE_BOT = ethers.parseEther("3.0");
      await treasury.createTask(
        1,
        "Over-limit compute payout",
        THREE_BOT,
        NATIVE_BOT,
        recipient1.address,
        ethers.ZeroAddress,
        0
      );

      await treasury.approveTask(1);

      await expect(treasury.executeTask(1)).to.be.revertedWithCustomError(
        treasury,
        "ExceedsPerTxLimit"
      );
    });

    it("SECURITY: Should revert if destination is not in approved targets", async function () {
      // recipient2 is not in approved targets (only recipient1 is approved)
      await treasury.createTask(
        1,
        "Payout to unauthorized address",
        ONE_BOT,
        NATIVE_BOT,
        recipient2.address,
        ethers.ZeroAddress,
        0
      );

      await treasury.approveTask(1);

      await expect(treasury.executeTask(1)).to.be.revertedWithCustomError(
        treasury,
        "DestinationNotApproved"
      );
    });

    it("SECURITY: Should revert if payment exceeds daily limit", async function () {
      // Daily limit is 5 BOT. Per tx is 2 BOT.
      // Execute 2 BOT twice (total 4 BOT), then try 2 BOT again (total 6 BOT > 5 BOT)
      const TWO_BOT = ethers.parseEther("2.0");

      for (let i = 1; i <= 2; i++) {
        await treasury.createTask(1, `Job ${i}`, TWO_BOT, NATIVE_BOT, recipient1.address, ethers.ZeroAddress, 0);
        await treasury.approveTask(i);
        await treasury.executeTask(i);
      }

      // 3rd task exceeds daily limit (4 + 2 = 6 > 5)
      await treasury.createTask(1, "Job 3", TWO_BOT, NATIVE_BOT, recipient1.address, ethers.ZeroAddress, 0);
      await treasury.approveTask(3);

      await expect(treasury.executeTask(3)).to.be.revertedWithCustomError(
        treasury,
        "ExceedsDailyLimit"
      );
    });

    it("SECURITY: Should revert if task is not approved", async function () {
      await treasury.createTask(1, "Pending task", ONE_BOT, NATIVE_BOT, recipient1.address, ethers.ZeroAddress, 0);

      // Execute without approveTask
      await expect(treasury.executeTask(1)).to.be.revertedWithCustomError(
        treasury,
        "TaskNotApproved"
      );
    });

    it("SECURITY: Should revert if task has already been executed", async function () {
      await treasury.createTask(1, "Job 1", ONE_BOT, NATIVE_BOT, recipient1.address, ethers.ZeroAddress, 0);
      await treasury.approveTask(1);
      await treasury.executeTask(1);

      // Try executing the same task again
      await expect(treasury.executeTask(1)).to.be.revertedWithCustomError(
        treasury,
        "TaskNotApproved"
      );
    });

    it("SECURITY: Should revert when agent is paused", async function () {
      await treasury.createTask(1, "Job 1", ONE_BOT, NATIVE_BOT, recipient1.address, ethers.ZeroAddress, 0);
      await treasury.approveTask(1);

      await treasury.pauseAgent(1);

      await expect(treasury.executeTask(1)).to.be.revertedWithCustomError(
        treasury,
        "AgentInactive"
      );
    });

    it("SECURITY: Should revert when treasury is paused", async function () {
      await treasury.createTask(1, "Job 1", ONE_BOT, NATIVE_BOT, recipient1.address, ethers.ZeroAddress, 0);
      await treasury.approveTask(1);

      await treasury.pause();

      await expect(treasury.executeTask(1)).to.be.revertedWithCustomError(
        treasury,
        "TreasuryIsPaused"
      );
    });
  });

  describe("5. View Layer Verification", function () {
    it("should return clean summary metrics matching live contract state", async function () {
      await treasury.deposit({ value: FIVE_BOT });
      await treasury.createAgent("Agent 1", agentWallet.address, TEN_BOT, FIVE_BOT, ONE_BOT, 0);

      const summary = await treasury.getTreasurySummary();
      expect(summary.balance).to.equal(FIVE_BOT);
      expect(summary.deposited).to.equal(FIVE_BOT);
      expect(summary.spent).to.equal(0n);
      expect(summary.isPaused).to.equal(false);
      expect(summary.totalAgents).to.equal(1n);
      expect(summary.totalTasks).to.equal(0n);
    });
  });
});
