import {
  createPublicClient,
  defineChain,
  http as viemHttp,
} from "viem";
import {
  createConfig,
  http,
} from "wagmi";
import { injected } from "wagmi/connectors";

const rpcUrl =
  import.meta.env.VITE_MONAD_TESTNET_RPC_URL ||
  "https://testnet-rpc.monad.xyz";

export const monadTestnet = defineChain({
  id: 10143,
  name: "Monad Testnet",
  nativeCurrency: {
    name: "Monad",
    symbol: "MON",
    decimals: 18,
  },
  rpcUrls: {
    default: {
      http: [rpcUrl],
    },
  },
  blockExplorers: {
    default: {
      name: "MonadVision",
      url: "https://testnet.monadvision.com",
    },
  },
  testnet: true,
});

export const wagmiConfig = createConfig({
  chains: [monadTestnet],
  connectors: [
    injected({
      shimDisconnect: true,
    }),
  ],
  transports: {
    [monadTestnet.id]: http(rpcUrl),
  },
});

export const publicClient = createPublicClient({
  chain: monadTestnet,
  transport: viemHttp(rpcUrl),
  pollingInterval: 2_000,
});