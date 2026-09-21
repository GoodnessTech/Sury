// SPDX-License-Identifier: MIT
pragma solidity 0.8.24;

/**
 * @title SuryTreasury
 * @notice Core smart contract for SURY — Agent Treasury OS on BOT Chain Mainnet.
 * @dev Enforces the core primitive: Treasury -> Agent -> Policy -> Task -> Payment -> Receipt.
 * All financial policy checks are strictly enforced on-chain.
 */
contract SuryTreasury {
    // --- Custom Errors ---
    error Unauthorized();
    error TreasuryIsPaused();
    error TreasuryNotPaused();
    error InsufficientTreasuryBalance();
    error InvalidAmount();
    error InvalidAddress();
    error AgentNotFound();
    error AgentInactive();
    error AgentExpired();
    error PolicyNotFound();
    error PolicyInactive();
    error PolicyExpired();
    error TokenNotApproved();
    error DestinationNotApproved();
    error ExceedsPerTxLimit(uint256 amount, uint256 limit);
    error ExceedsRemainingBudget(uint256 amount, uint256 remaining);
    error ExceedsDailyLimit(uint256 requested, uint256 currentDailySpent, uint256 dailyLimit);
    error TaskNotFound();
    error TaskNotApproved();
    error TaskAlreadyExecuted();
    error TransferFailed();
    error ReentrancyGuardReentrantCall();

    // --- Enums ---
    enum EntityStatus {
        Active,
        Paused,
        Pending,
        Approved,
        Settled,
        Rejected,
        Expired,
        Cancelled
    }

    // --- Structs ---
    struct Agent {
        uint256 id;
        string name;
        address agentAddress;
        uint256 assignedBudget;
        uint256 remainingBudget;
        uint256 spent;
        uint256 dailyLimit;
        uint256 perTransactionLimit;
        uint256 policyId;
        uint256 taskCount;
        EntityStatus status;
        uint256 expiry;
        uint256 lastDay;
        uint256 dailySpent;
    }

    struct Policy {
        uint256 id;
        uint256 agentId;
        uint256 budget;
        uint256 perTransactionLimit;
        uint256 dailyLimit;
        address[] approvedTokens;
        address[] approvedTargets;
        uint256 expiry;
        EntityStatus status;
    }

    struct Task {
        uint256 id;
        uint256 agentId;
        string description;
        uint256 amount;
        address token;
        address destination;
        address target;
        uint256 policyId;
        EntityStatus status;
        uint256 createdAt;
        uint256 expiry;
    }

    // Standard sentinel address for native BOT token
    address public constant NATIVE_BOT = 0xEeeeeEeeeEeEeeEeEeEeeEEEeeeeEeeeeeeeEEeE;

    // --- State Variables ---
    address public owner;
    bool public paused;
    uint256 private _status; // Reentrancy status: 1 = not entered, 2 = entered

    uint256 public totalDeposited;
    uint256 public totalSpent;
    uint256 public treasuryLastDay;
    uint256 public todaySpent;

    uint256 public agentCount;
    uint256 public policyCount;
    uint256 public taskCount;

    mapping(uint256 => Agent) public agents;
    mapping(uint256 => Policy) public policies;
    mapping(uint256 => Task) public tasks;

    // --- Events ---
    event TreasuryCreated(address indexed owner, uint256 timestamp);
    event TreasuryFunded(address indexed sender, uint256 amount, uint256 newBalance, uint256 timestamp);
    event TreasuryWithdrawn(address indexed owner, address indexed recipient, uint256 amount, uint256 timestamp);
    event TreasuryPaused(address indexed by, uint256 timestamp);
    event TreasuryUnpaused(address indexed by, uint256 timestamp);

    event AgentCreated(
        uint256 indexed agentId,
        string name,
        address indexed agentAddress,
        uint256 assignedBudget,
        uint256 dailyLimit,
        uint256 perTxLimit,
        uint256 timestamp
    );
    event AgentStatusUpdated(uint256 indexed agentId, EntityStatus status, uint256 timestamp);
    event AgentBudgetUpdated(uint256 indexed agentId, uint256 newBudget, uint256 timestamp);

    event PolicyCreated(
        uint256 indexed policyId,
        uint256 indexed agentId,
        uint256 budget,
        uint256 perTxLimit,
        uint256 dailyLimit,
        uint256 expiry,
        uint256 timestamp
    );
    event PolicyStatusUpdated(uint256 indexed policyId, EntityStatus status, uint256 timestamp);

    event TaskCreated(
        uint256 indexed taskId,
        uint256 indexed agentId,
        string description,
        uint256 amount,
        address destination,
        uint256 timestamp
    );
    event TaskApproved(uint256 indexed taskId, address indexed approvedBy, uint256 timestamp);
    event TaskRejected(uint256 indexed taskId, address indexed rejectedBy, uint256 timestamp);
    event PaymentExecuted(
        uint256 indexed taskId,
        uint256 indexed agentId,
        address indexed recipient,
        uint256 amount,
        address token,
        uint256 timestamp
    );

    // --- Modifiers ---
    modifier onlyOwner() {
        if (msg.sender != owner) revert Unauthorized();
        _;
    }

    modifier whenNotPaused() {
        if (paused) revert TreasuryIsPaused();
        _;
    }

    modifier nonReentrant() {
        if (_status == 2) revert ReentrancyGuardReentrantCall();
        _status = 2;
        _;
        _status = 1;
    }

    // --- Constructor ---
    constructor() {
        owner = msg.sender;
        _status = 1;
        treasuryLastDay = block.timestamp / 1 days;
        emit TreasuryCreated(msg.sender, block.timestamp);
    }

    // Receive native BOT
    receive() external payable {
        if (msg.value > 0) {
            totalDeposited += msg.value;
            emit TreasuryFunded(msg.sender, msg.value, address(this).balance, block.timestamp);
        }
    }

    // --- Treasury Functions ---

    /**
     * @notice Deposit native BOT funds into the treasury
     */
    function deposit() external payable {
        if (msg.value == 0) revert InvalidAmount();
        totalDeposited += msg.value;
        emit TreasuryFunded(msg.sender, msg.value, address(this).balance, block.timestamp);
    }

    /**
     * @notice Withdraw native BOT funds from the treasury to an external address
     * @param amount The amount of BOT in wei to withdraw
     * @param recipient The address to receive withdrawn funds
     */
    function withdraw(uint256 amount, address payable recipient) external onlyOwner nonReentrant {
        if (amount == 0) revert InvalidAmount();
        if (recipient == address(0)) revert InvalidAddress();
        if (address(this).balance < amount) revert InsufficientTreasuryBalance();

        (bool success, ) = recipient.call{value: amount}("");
        if (!success) revert TransferFailed();

        emit TreasuryWithdrawn(owner, recipient, amount, block.timestamp);
    }

    /**
     * @notice Emergency pause protocol operations
     */
    function pause() external onlyOwner {
        if (paused) revert TreasuryIsPaused();
        paused = true;
        emit TreasuryPaused(msg.sender, block.timestamp);
    }

    /**
     * @notice Unpause protocol operations
     */
    function unpause() external onlyOwner {
        if (!paused) revert TreasuryNotPaused();
        paused = false;
        emit TreasuryUnpaused(msg.sender, block.timestamp);
    }

    // --- Agent Management ---

    /**
     * @notice Register a new autonomous agent under treasury policy
     * @param name Descriptive name of the agent
     * @param agentAddress Execution address of the agent (EOA or ERC-4337 smart account)
     * @param assignedBudget Maximum total budget allocated to the agent
     * @param dailyLimit Maximum spending allowed per rolling day
     * @param perTxLimit Maximum spending allowed per single execution
     * @param expiry Expiration timestamp (0 = no expiry)
     */
    function createAgent(
        string calldata name,
        address agentAddress,
        uint256 assignedBudget,
        uint256 dailyLimit,
        uint256 perTxLimit,
        uint256 expiry
    ) external onlyOwner returns (uint256) {
        if (agentAddress == address(0)) revert InvalidAddress();

        agentCount++;
        uint256 id = agentCount;

        agents[id] = Agent({
            id: id,
            name: name,
            agentAddress: agentAddress,
            assignedBudget: assignedBudget,
            remainingBudget: assignedBudget,
            spent: 0,
            dailyLimit: dailyLimit,
            perTransactionLimit: perTxLimit,
            policyId: 0,
            taskCount: 0,
            status: EntityStatus.Active,
            expiry: expiry,
            lastDay: block.timestamp / 1 days,
            dailySpent: 0
        });

        emit AgentCreated(id, name, agentAddress, assignedBudget, dailyLimit, perTxLimit, block.timestamp);
        return id;
    }

    /**
     * @notice Pause an agent to temporarily block spending
     */
    function pauseAgent(uint256 agentId) external onlyOwner {
        if (agentId == 0 || agentId > agentCount) revert AgentNotFound();
        agents[agentId].status = EntityStatus.Paused;
        emit AgentStatusUpdated(agentId, EntityStatus.Paused, block.timestamp);
    }

    /**
     * @notice Unpause an agent to re-enable spending
     */
    function unpauseAgent(uint256 agentId) external onlyOwner {
        if (agentId == 0 || agentId > agentCount) revert AgentNotFound();
        agents[agentId].status = EntityStatus.Active;
        emit AgentStatusUpdated(agentId, EntityStatus.Active, block.timestamp);
    }

    // --- Policy Management ---

    /**
     * @notice Create a spending policy and attach it to an agent
     * @param agentId The target agent ID
     * @param budget Total budget cap for the policy
     * @param perTxLimit Per-transaction spending limit
     * @param dailyLimit Daily spending limit
     * @param approvedTokens Whitelisted token addresses (use NATIVE_BOT for BOT)
     * @param approvedTargets Whitelisted recipient/contract addresses (empty array = any destination)
     * @param expiry Expiry timestamp (0 for no expiry)
     */
    function createPolicy(
        uint256 agentId,
        uint256 budget,
        uint256 perTxLimit,
        uint256 dailyLimit,
        address[] calldata approvedTokens,
        address[] calldata approvedTargets,
        uint256 expiry
    ) external onlyOwner returns (uint256) {
        if (agentId == 0 || agentId > agentCount) revert AgentNotFound();

        policyCount++;
        uint256 pId = policyCount;

        policies[pId] = Policy({
            id: pId,
            agentId: agentId,
            budget: budget,
            perTransactionLimit: perTxLimit,
            dailyLimit: dailyLimit,
            approvedTokens: approvedTokens,
            approvedTargets: approvedTargets,
            expiry: expiry,
            status: EntityStatus.Active
        });

        // Link policy to agent and update limits if provided
        Agent storage ag = agents[agentId];
        ag.policyId = pId;
        if (budget > 0) {
            ag.assignedBudget = budget;
            ag.remainingBudget = budget;
        }
        if (perTxLimit > 0) ag.perTransactionLimit = perTxLimit;
        if (dailyLimit > 0) ag.dailyLimit = dailyLimit;

        emit PolicyCreated(pId, agentId, budget, perTxLimit, dailyLimit, expiry, block.timestamp);
        return pId;
    }

    /**
     * @notice Pause a spending policy
     */
    function pausePolicy(uint256 policyId) external onlyOwner {
        if (policyId == 0 || policyId > policyCount) revert PolicyNotFound();
        policies[policyId].status = EntityStatus.Paused;
        emit PolicyStatusUpdated(policyId, EntityStatus.Paused, block.timestamp);
    }

    /**
     * @notice Unpause a spending policy
     */
    function unpausePolicy(uint256 policyId) external onlyOwner {
        if (policyId == 0 || policyId > policyCount) revert PolicyNotFound();
        policies[policyId].status = EntityStatus.Active;
        emit PolicyStatusUpdated(policyId, EntityStatus.Active, block.timestamp);
    }

    // --- Task Lifecycle & Execution ---

    /**
     * @notice Create a task authorizing an agent to execute a payment
     * @param agentId The agent executing the task
     * @param description Brief description of the task
     * @param amount Payment amount in wei
     * @param token Payment token (NATIVE_BOT or address(0))
     * @param destination Recipient address
     * @param target Target contract address (optional)
     * @param expiry Expiry timestamp (0 = no expiry)
     */
    function createTask(
        uint256 agentId,
        string calldata description,
        uint256 amount,
        address token,
        address destination,
        address target,
        uint256 expiry
    ) external returns (uint256) {
        if (agentId == 0 || agentId > agentCount) revert AgentNotFound();
        if (destination == address(0)) revert InvalidAddress();
        if (amount == 0) revert InvalidAmount();

        Agent storage ag = agents[agentId];
        // Allow owner or agent to create tasks
        if (msg.sender != owner && msg.sender != ag.agentAddress) revert Unauthorized();

        taskCount++;
        uint256 tId = taskCount;
        ag.taskCount++;

        tasks[tId] = Task({
            id: tId,
            agentId: agentId,
            description: description,
            amount: amount,
            token: token == address(0) ? NATIVE_BOT : token,
            destination: destination,
            target: target,
            policyId: ag.policyId,
            status: EntityStatus.Pending,
            createdAt: block.timestamp,
            expiry: expiry
        });

        emit TaskCreated(tId, agentId, description, amount, destination, block.timestamp);
        return tId;
    }

    /**
     * @notice Approve a pending task for execution
     */
    function approveTask(uint256 taskId) external onlyOwner {
        if (taskId == 0 || taskId > taskCount) revert TaskNotFound();
        Task storage t = tasks[taskId];
        if (t.status != EntityStatus.Pending) revert TaskAlreadyExecuted();

        t.status = EntityStatus.Approved;
        emit TaskApproved(taskId, msg.sender, block.timestamp);
    }

    /**
     * @notice Reject a pending task
     */
    function rejectTask(uint256 taskId) external onlyOwner {
        if (taskId == 0 || taskId > taskCount) revert TaskNotFound();
        Task storage t = tasks[taskId];
        if (t.status != EntityStatus.Pending) revert TaskAlreadyExecuted();

        t.status = EntityStatus.Rejected;
        emit TaskRejected(taskId, msg.sender, block.timestamp);
    }

    /**
     * @notice Execute an approved task and settle the payment.
     * @dev Strictly enforces on-chain policy before settlement.
     * Reverts if any policy check fails.
     */
    function executeTask(uint256 taskId) external nonReentrant whenNotPaused {
        if (taskId == 0 || taskId > taskCount) revert TaskNotFound();
        Task storage t = tasks[taskId];

        if (t.status != EntityStatus.Approved) revert TaskNotApproved();
        if (t.expiry > 0 && block.timestamp > t.expiry) revert PolicyExpired();

        Agent storage ag = agents[t.agentId];
        // Permitted callers: Treasury owner or the assigned agent address
        if (msg.sender != owner && msg.sender != ag.agentAddress) revert Unauthorized();

        // 1. Check Agent Status & Expiry
        if (ag.status != EntityStatus.Active) revert AgentInactive();
        if (ag.expiry > 0 && block.timestamp > ag.expiry) revert AgentExpired();

        // 2. Check Policy Status & Expiry (if policy attached)
        if (t.policyId > 0 && t.policyId <= policyCount) {
            Policy storage p = policies[t.policyId];
            if (p.status != EntityStatus.Active) revert PolicyInactive();
            if (p.expiry > 0 && block.timestamp > p.expiry) revert PolicyExpired();

            // Check approved token
            if (p.approvedTokens.length > 0) {
                bool tokenOk = false;
                for (uint256 i = 0; i < p.approvedTokens.length; i++) {
                    if (p.approvedTokens[i] == t.token || (p.approvedTokens[i] == address(0) && t.token == NATIVE_BOT)) {
                        tokenOk = true;
                        break;
                    }
                }
                if (!tokenOk) revert TokenNotApproved();
            }

            // Check approved targets / destinations
            if (p.approvedTargets.length > 0) {
                bool destOk = false;
                for (uint256 i = 0; i < p.approvedTargets.length; i++) {
                    if (p.approvedTargets[i] == t.destination || p.approvedTargets[i] == t.target) {
                        destOk = true;
                        break;
                    }
                }
                if (!destOk) revert DestinationNotApproved();
            }
        }

        // 3. Check Per-Transaction Limit
        if (ag.perTransactionLimit > 0 && t.amount > ag.perTransactionLimit) {
            revert ExceedsPerTxLimit(t.amount, ag.perTransactionLimit);
        }

        // 4. Check Remaining Budget
        if (t.amount > ag.remainingBudget) {
            revert ExceedsRemainingBudget(t.amount, ag.remainingBudget);
        }

        // 5. Check Daily Limit
        uint256 currentDay = block.timestamp / 1 days;
        if (ag.lastDay != currentDay) {
            ag.dailySpent = 0;
            ag.lastDay = currentDay;
        }

        if (ag.dailyLimit > 0 && (ag.dailySpent + t.amount > ag.dailyLimit)) {
            revert ExceedsDailyLimit(t.amount, ag.dailySpent, ag.dailyLimit);
        }

        // 6. Check Treasury Solvency
        if (address(this).balance < t.amount) revert InsufficientTreasuryBalance();

        // --- State Updates ---
        ag.remainingBudget -= t.amount;
        ag.spent += t.amount;
        ag.dailySpent += t.amount;

        totalSpent += t.amount;
        if (treasuryLastDay != currentDay) {
            todaySpent = 0;
            treasuryLastDay = currentDay;
        }
        todaySpent += t.amount;

        t.status = EntityStatus.Settled;

        // --- Settlement Transfer ---
        (bool success, ) = payable(t.destination).call{value: t.amount}("");
        if (!success) revert TransferFailed();

        // --- Emit Verifiable Receipt Event ---
        emit PaymentExecuted(t.id, ag.id, t.destination, t.amount, t.token, block.timestamp);
    }

    // --- View Functions for Real Blockchain Data Layer ---

    /**
     * @notice Get all registered agents
     */
    function getAgents() external view returns (Agent[] memory) {
        Agent[] memory list = new Agent[](agentCount);
        for (uint256 i = 1; i <= agentCount; i++) {
            list[i - 1] = agents[i];
        }
        return list;
    }

    /**
     * @notice Get single agent details
     */
    function getAgent(uint256 agentId) external view returns (Agent memory) {
        if (agentId == 0 || agentId > agentCount) revert AgentNotFound();
        return agents[agentId];
    }

    /**
     * @notice Get all created policies
     */
    function getPolicies() external view returns (Policy[] memory) {
        Policy[] memory list = new Policy[](policyCount);
        for (uint256 i = 1; i <= policyCount; i++) {
            list[i - 1] = policies[i];
        }
        return list;
    }

    /**
     * @notice Get single policy details
     */
    function getPolicy(uint256 policyId) external view returns (Policy memory) {
        if (policyId == 0 || policyId > policyCount) revert PolicyNotFound();
        return policies[policyId];
    }

    /**
     * @notice Get all created tasks
     */
    function getTasks() external view returns (Task[] memory) {
        Task[] memory list = new Task[](taskCount);
        for (uint256 i = 1; i <= taskCount; i++) {
            list[i - 1] = tasks[i];
        }
        return list;
    }

    /**
     * @notice Get single task details
     */
    function getTask(uint256 taskId) external view returns (Task memory) {
        if (taskId == 0 || taskId > taskCount) revert TaskNotFound();
        return tasks[taskId];
    }

    /**
     * @notice Get high-level protocol metrics
     */
    function getTreasurySummary()
        external
        view
        returns (
            uint256 balance,
            uint256 deposited,
            uint256 spent,
            uint256 todaySpend,
            bool isPaused,
            address treasuryOwner,
            uint256 totalAgents,
            uint256 totalTasks
        )
    {
        uint256 currentDay = block.timestamp / 1 days;
        uint256 liveTodaySpent = (treasuryLastDay == currentDay) ? todaySpent : 0;

        return (
            address(this).balance,
            totalDeposited,
            totalSpent,
            liveTodaySpent,
            paused,
            owner,
            agentCount,
            taskCount
        );
    }
}
