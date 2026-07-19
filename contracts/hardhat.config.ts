import hardhatToolboxViem from "@nomicfoundation/hardhat-toolbox-viem";
import {
  configVariable,
  defineConfig,
} from "hardhat/config";

export default defineConfig({
  plugins: [hardhatToolboxViem],

  solidity: {
    version: "0.8.28",
    settings: {
      evmVersion: "prague",
      optimizer: {
        enabled: true,
        runs: 200,
      },
    },
  },

  networks: {
    monadTestnet: {
      type: "http",
      chainType: "l1",
      chainId: 10143,
      url: configVariable("MONAD_TESTNET_RPC_URL"),
      accounts: [
        configVariable("MONAD_TESTNET_PRIVATE_KEY"),
      ],
    },
  },
});