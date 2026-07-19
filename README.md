# FieldSeal

**Proof before payment for field jobs.**

FieldSeal is an onchain job escrow application built on Monad Testnet. A client funds a job, the assigned worker submits proof of completion, and the client approves the work to release payment directly from the smart contract.

## Live Project

- **Application:** https://fieldseal.vercel.app
- **Source code:** https://github.com/Stunna-X/fieldseal
- **Network:** Monad Testnet
- **Contract:** `0x4aBF07920D7f4da27E3eBf34238612407a44A4be`
- **Explorer:** https://testnet.monadvision.com/address/0x4aBF07920D7f4da27E3eBf34238612407a44A4be

## The Problem

Field jobs are often completed before their documentation, approval, and payment catch up.

Job agreements, completion evidence, customer approval, and payment records may be scattered across phone calls, messages, photographs, and verbal promises.

This creates problems for both sides:

- Workers may complete jobs without guaranteed payment.
- Clients may pay before receiving verifiable evidence.
- Completion records may be changed, lost, or disputed.
- Payment approval can take longer than the work itself.

## The Solution

FieldSeal provides one transparent workflow:

1. A client creates a job and locks testnet MON in the contract.
2. The assigned worker completes the job.
3. The worker submits a completion note and evidence fingerprint.
4. The client reviews and approves the completed work.
5. The contract releases the escrowed payment to the worker.

The evidence file itself is not uploaded publicly. FieldSeal hashes it locally inside the browser and stores only its cryptographic fingerprint onchain.

## Working End-to-End Flow

The deployed application has completed a real Monad Testnet workflow:

- Job created
- Payment funded and locked
- Worker assigned
- Completion proof submitted
- Evidence fingerprint recorded
- Client approval completed
- Payment released to the worker
- Job marked as paid

The displayed job records are read from the deployed contract and are not hardcoded frontend data.

## Core Features

- Browser wallet connection
- Monad Testnet detection and switching
- Client and worker role detection
- Funded field-job creation
- Smart-contract escrow
- Local evidence hashing
- Onchain completion-proof submission
- Client approval and payment release
- Cancellation and refund before proof submission
- Live contract reads
- Transaction confirmation feedback
- MonadVision explorer links
- Responsive desktop and mobile interface

## Smart Contract Lifecycle

```text
Funded
   |
   | Worker submits proof
   v
Submitted
   |
   | Client approves
   v
Completed / Paid
```

Before proof is submitted, the client can cancel the job:

```text
Funded -> Cancelled / Refunded
```

## Smart Contract Functions

```solidity
createJob(address worker, string description)
submitEvidence(uint256 jobId, string evidenceNote, bytes32 evidenceHash)
approveAndRelease(uint256 jobId)
cancelJob(uint256 jobId)
getJob(uint256 jobId)
getClientJobIds(address client)
getWorkerJobIds(address worker)
```

## Contract Security

The FieldSeal contract includes:

- Client and worker authorization checks
- Explicit job-state validation
- Checks-effects-interactions ordering
- Reentrancy protection
- Zero-address validation
- Zero-payment validation
- Client and worker self-assignment prevention
- Empty-description validation
- Empty-evidence validation
- Failed-transfer handling
- Restricted cancellation after proof submission

The deployment wallet private key is stored outside the repository using Hardhat's encrypted keystore.

## Tests

FieldSeal currently has **12 passing Solidity tests** covering:

- Job creation
- Escrow funding
- Worker proof submission
- Client approval
- Payment release
- Client cancellation
- Refund handling
- Unauthorized proof submission
- Unauthorized payment approval
- Invalid state transitions
- Empty descriptions and evidence
- Zero-value jobs
- Client and worker self-assignment

Run the tests:

```bash
cd contracts
npm install
npx hardhat test
```

Expected result:

```text
12 passing
```

## Technology Stack

### Smart Contract

- Solidity 0.8.28
- Hardhat 3
- Hardhat Ignition
- Viem
- Solidity Node Test Runner
- Monad Testnet
- Prague EVM target

### Frontend

- React
- Vite
- Wagmi
- Viem
- TanStack Query
- Lucide React
- Custom responsive CSS

### Deployment

- Smart contract: Monad Testnet
- Frontend: Vercel
- Source code: GitHub

## Repository Structure

```text
fieldseal/
├── contracts/
│   ├── contracts/
│   │   ├── FieldSeal.sol
│   │   └── FieldSeal.t.sol
│   ├── ignition/
│   │   └── modules/
│   │       └── FieldSeal.ts
│   ├── hardhat.config.ts
│   ├── package.json
│   └── package-lock.json
│
├── web/
│   ├── src/
│   │   ├── config/
│   │   │   └── wagmi.js
│   │   ├── contracts/
│   │   │   └── fieldSeal.js
│   │   ├── App.jsx
│   │   ├── index.css
│   │   └── main.jsx
│   ├── .env.example
│   ├── package.json
│   └── vite.config.js
│
├── .gitignore
├── LICENSE
└── README.md
```

## Local Frontend Setup

Clone the repository:

```bash
git clone https://github.com/Stunna-X/fieldseal.git
cd fieldseal/web
npm install
```

Create the local environment file on Windows:

```powershell
Copy-Item .env.example .env.local
```

Required frontend variables:

```env
VITE_FIELDSEAL_CONTRACT_ADDRESS=0x4aBF07920D7f4da27E3eBf34238612407a44A4be
VITE_MONAD_TESTNET_RPC_URL=https://testnet-rpc.monad.xyz
```

Start the frontend:

```bash
npm run dev
```

Open:

```text
http://localhost:5173
```

Vite may use another port if `5173` is already occupied.

## Production Build

```bash
cd web
npm install
npm run build
```

The production files are generated inside:

```text
web/dist
```

## Contract Compilation

```bash
cd contracts
npm install
npx hardhat compile
```

FieldSeal uses Solidity `0.8.28` with the `prague` EVM target.

## Contract Deployment

The included Hardhat Ignition module deploys FieldSeal:

```bash
cd contracts
npx hardhat ignition deploy ./ignition/modules/FieldSeal.ts --network monadTestnet
```

Deployment requires these encrypted Hardhat configuration variables:

```text
MONAD_TESTNET_RPC_URL
MONAD_TESTNET_PRIVATE_KEY
```

Never commit or share:

- Wallet private keys
- Seed phrases
- MetaMask passwords
- Hardhat keystore passwords

## Known Limitations

FieldSeal is currently a hackathon prototype running on Monad Testnet.

- Testnet MON has no monetary value.
- Payment release depends on client approval.
- Third-party dispute arbitration is not yet included.
- Evidence files are hashed locally but are not stored by FieldSeal.
- Job descriptions and completion notes are public.
- The application currently targets browser-based EVM wallets.

## Future Development

Potential extensions include:

- Independent dispute resolution
- Milestone-based payments
- Multiple assigned workers
- Organization accounts and permissions
- Encrypted evidence storage
- Decentralized file storage
- Client and contractor reputation
- Stablecoin escrow
- Notifications and approval reminders
- Mobile and offline field workflows

## Hackathon

Built as a solo submission for **Spark — Build Anything onchain that solves a personal problem**.

FieldSeal was created as a focused solution to a problem encountered while developing field-operations software: proving that work was completed and making approval-to-payment faster and more trustworthy.

## Disclaimer

FieldSeal currently operates on Monad Testnet.

**Testnet MON is not real money and has no monetary value. Do not send real funds to the deployed contract.**

## License

MIT
