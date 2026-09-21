const { ethers, network } = require("hardhat");
const fs = require("fs");
const path = require("path");

async function main() {
  console.log("==================================================");
  console.log("SURY Protocol — BOT Chain Mainnet Deployment");
  console.log("==================================================");

  const networkInfo = await ethers.provider.getNetwork();
  const chainId = Number(networkInfo.chainId);
  const rpcUrl = network.config.url || "https://rpc.botchain.ai";
  const [deployer] = await ethers.getSigners();

  if (!deployer) {
    console.error("CRITICAL ERROR: No deployer signer configured. Please verify DEPLOYER_PRIVATE_KEY in .env");
    process.exit(1);
  }

  const deployerAddress = await deployer.getAddress();
  const balance = await ethers.provider.getBalance(deployerAddress);

  console.log(`TARGET NETWORK:    BOT Chain Mainnet`);
  console.log(`CHAIN ID:          ${chainId}`);
  console.log(`RPC:               ${rpcUrl}`);
  console.log(`DEPLOYER ADDRESS:  ${deployerAddress}`);
  console.log(`DEPLOYER BALANCE:  ${ethers.formatEther(balance)} BOT`);

  // Strict check: Chain ID must equal 677
  if (chainId !== 677) {
    console.error(`\nCRITICAL SAFETY STOP: Chain ID is ${chainId}, expected 677.`);
    console.error("Aborting deployment to prevent deploying to unintended network.");
    process.exit(1);
  }

  if (balance === 0n) {
    console.error(`\nCRITICAL ERROR: Deployer account ${deployerAddress} has 0 BOT balance.`);
    console.error("Please fund this address with native BOT gas tokens on BOT Chain Mainnet before deploying.");
    process.exit(1);
  }

  // Query gas conditions
  const feeData = await ethers.provider.getFeeData();
  const gasPrice = feeData.gasPrice || (await ethers.provider.send("eth_gasPrice", []));
  console.log(`CURRENT GAS PRICE: ${ethers.formatUnits(gasPrice, "gwei")} gwei`);

  console.log("\nEstimating deployment gas...");
  const SuryTreasuryFactory = await ethers.getContractFactory("SuryTreasury", deployer);
  const deployTx = await SuryTreasuryFactory.getDeployTransaction();
  const estimatedGas = await ethers.provider.estimateGas(deployTx);
  console.log(`ESTIMATED GAS:     ${estimatedGas.toString()}`);
  const estimatedCost = estimatedGas * BigInt(gasPrice);
  console.log(`ESTIMATED COST:    ${ethers.formatEther(estimatedCost)} BOT`);

  if (balance < estimatedCost) {
    console.error(`CRITICAL ERROR: Balance (${ethers.formatEther(balance)} BOT) is lower than estimated cost (${ethers.formatEther(estimatedCost)} BOT).`);
    process.exit(1);
  }

  console.log("\nBroadcasting deployment transaction to BOT Chain Mainnet...");
  const treasury = await SuryTreasuryFactory.deploy({
    gasPrice: gasPrice,
  });

  const txHash = treasury.deploymentTransaction()?.hash;
  console.log(`TRANSACTION SUBMITTED: ${txHash}`);
  console.log("Waiting for confirmation on BOT Chain Mainnet...");

  await treasury.waitForDeployment();
  const contractAddress = await treasury.getAddress();
  const receipt = await treasury.deploymentTransaction()?.wait();

  const gasUsed = receipt?.gasUsed || 0n;
  const actualGasPrice = receipt?.gasPrice || BigInt(gasPrice);
  const actualCost = gasUsed * actualGasPrice;

  console.log("\n==================================================");
  console.log("DEPLOYMENT SUCCESSFUL!");
  console.log("==================================================");
  console.log(`CONTRACT ADDRESS:  ${contractAddress}`);
  console.log(`TRANSACTION HASH:  ${receipt?.hash}`);
  console.log(`BLOCK NUMBER:      ${receipt?.blockNumber}`);
  console.log(`GAS USED:          ${gasUsed.toString()}`);
  console.log(`ACTUAL COST:       ${ethers.formatEther(actualCost)} BOT`);
  console.log(`EXPLORER LINK:     https://scan.botchain.ai/address/${contractAddress}`);
  console.log("==================================================");

  // Write deployment receipt
  const deploymentInfo = {
    network: "BOT Chain Mainnet",
    chainId: 677,
    rpcUrl: rpcUrl,
    contractName: "SuryTreasury",
    contractAddress: contractAddress,
    transactionHash: receipt?.hash,
    blockNumber: Number(receipt?.blockNumber),
    deployer: deployerAddress,
    gasUsed: gasUsed.toString(),
    gasPrice: actualGasPrice.toString(),
    deploymentCostBot: ethers.formatEther(actualCost),
    compilerVersion: "0.8.24",
    deployedAt: new Date().toISOString(),
  };

  const receiptPath = path.resolve(__dirname, "../deployment-receipt.json");
  fs.writeFileSync(receiptPath, JSON.stringify(deploymentInfo, null, 2));
  console.log(`Deployment record saved to: ${receiptPath}`);

  // Automatically update or create frontend env
  const frontendEnvPath = path.resolve(__dirname, "../../Sury Frontend/.env");
  const envContent = [
    `VITE_SURY_TREASURY_ADDRESS=${contractAddress}`,
    `VITE_SURY_FACTORY_ADDRESS=${contractAddress}`,
    `VITE_SURY_POLICY_ADDRESS=${contractAddress}`,
    `VITE_BOT_CHAIN_RPC=https://rpc.botchain.ai`,
    `VITE_BOT_CHAIN_EXPLORER=https://scan.botchain.ai`,
  ].join("\n");
  fs.writeFileSync(frontendEnvPath, envContent + "\n");
  console.log(`Frontend environment updated at: ${frontendEnvPath}`);
}

main().catch((error) => {
  console.error("Deployment failed with error:", error);
  process.exit(1);
});
