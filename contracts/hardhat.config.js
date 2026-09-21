require("@nomicfoundation/hardhat-toolbox");
const dotenv = require("dotenv");
const path = require("path");

// Load from root .env or contracts .env
dotenv.config({ path: path.resolve(__dirname, "../.env") });
dotenv.config();

const deployerKey = process.env.DEPLOYER_PRIVATE_KEY || process.env.BOT_CHAIN_PRIVATE_KEY || "";
const accounts = deployerKey ? [deployerKey.startsWith("0x") ? deployerKey : `0x${deployerKey}`] : [];

/** @type import('hardhat/config').HardhatUserConfig */
module.exports = {
  solidity: {
    version: "0.8.24",
    settings: {
      optimizer: {
        enabled: true,
        runs: 1000,
      },
      viaIR: true,
    },
  },
  paths: {
    sources: "./contracts",
    tests: "./test",
    cache: "./cache",
    artifacts: "./artifacts",
  },
  networks: {
    hardhat: {
      chainId: 31337,
    },
    botchain: {
      url: "https://rpc.botchain.ai",
      chainId: 677,
      accounts: accounts,
    },
  },
  etherscan: {
    apiKey: {
      botchain: "empty",
    },
    customChains: [
      {
        network: "botchain",
        chainId: 677,
        urls: {
          apiURL: "https://scan.botchain.ai/api",
          browserURL: "https://scan.botchain.ai",
        },
      },
    ],
  },
};
