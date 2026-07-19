export const FIELDSEAL_ADDRESS =
  import.meta.env.VITE_FIELDSEAL_CONTRACT_ADDRESS ||
  "0x4aBF07920D7f4da27E3eBf34238612407a44A4be";

export const JOB_STATUS = Object.freeze({
  FUNDED: 0,
  SUBMITTED: 1,
  COMPLETED: 2,
  CANCELLED: 3,
});

export const JOB_STATUS_META = Object.freeze({
  [JOB_STATUS.FUNDED]: {
    label: "Funded",
    className: "status-funded",
  },
  [JOB_STATUS.SUBMITTED]: {
    label: "Proof submitted",
    className: "status-submitted",
  },
  [JOB_STATUS.COMPLETED]: {
    label: "Paid",
    className: "status-completed",
  },
  [JOB_STATUS.CANCELLED]: {
    label: "Refunded",
    className: "status-cancelled",
  },
});

export const fieldSealAbi = [
  {
    type: "function",
    name: "createJob",
    stateMutability: "payable",
    inputs: [
      {
        name: "worker",
        type: "address",
      },
      {
        name: "description",
        type: "string",
      },
    ],
    outputs: [
      {
        name: "jobId",
        type: "uint256",
      },
    ],
  },
  {
    type: "function",
    name: "submitEvidence",
    stateMutability: "nonpayable",
    inputs: [
      {
        name: "jobId",
        type: "uint256",
      },
      {
        name: "evidenceNote",
        type: "string",
      },
      {
        name: "evidenceHash",
        type: "bytes32",
      },
    ],
    outputs: [],
  },
  {
    type: "function",
    name: "approveAndRelease",
    stateMutability: "nonpayable",
    inputs: [
      {
        name: "jobId",
        type: "uint256",
      },
    ],
    outputs: [],
  },
  {
    type: "function",
    name: "cancelJob",
    stateMutability: "nonpayable",
    inputs: [
      {
        name: "jobId",
        type: "uint256",
      },
    ],
    outputs: [],
  },
  {
    type: "function",
    name: "getJob",
    stateMutability: "view",
    inputs: [
      {
        name: "jobId",
        type: "uint256",
      },
    ],
    outputs: [
      {
        name: "",
        type: "tuple",
        components: [
          {
            name: "id",
            type: "uint256",
          },
          {
            name: "client",
            type: "address",
          },
          {
            name: "worker",
            type: "address",
          },
          {
            name: "amount",
            type: "uint256",
          },
          {
            name: "description",
            type: "string",
          },
          {
            name: "evidenceNote",
            type: "string",
          },
          {
            name: "evidenceHash",
            type: "bytes32",
          },
          {
            name: "createdAt",
            type: "uint64",
          },
          {
            name: "submittedAt",
            type: "uint64",
          },
          {
            name: "completedAt",
            type: "uint64",
          },
          {
            name: "status",
            type: "uint8",
          },
        ],
      },
    ],
  },
  {
    type: "function",
    name: "getClientJobIds",
    stateMutability: "view",
    inputs: [
      {
        name: "client",
        type: "address",
      },
    ],
    outputs: [
      {
        name: "",
        type: "uint256[]",
      },
    ],
  },
  {
    type: "function",
    name: "getWorkerJobIds",
    stateMutability: "view",
    inputs: [
      {
        name: "worker",
        type: "address",
      },
    ],
    outputs: [
      {
        name: "",
        type: "uint256[]",
      },
    ],
  },
  {
    type: "function",
    name: "nextJobId",
    stateMutability: "view",
    inputs: [],
    outputs: [
      {
        name: "",
        type: "uint256",
      },
    ],
  },
];

export function normalizeJob(rawJob) {
  const values = Array.isArray(rawJob)
    ? rawJob
    : [
        rawJob.id,
        rawJob.client,
        rawJob.worker,
        rawJob.amount,
        rawJob.description,
        rawJob.evidenceNote,
        rawJob.evidenceHash,
        rawJob.createdAt,
        rawJob.submittedAt,
        rawJob.completedAt,
        rawJob.status,
      ];

  return {
    id: Number(values[0]),
    client: values[1],
    worker: values[2],
    amount: values[3],
    description: values[4],
    evidenceNote: values[5],
    evidenceHash: values[6],
    createdAt: Number(values[7]),
    submittedAt: Number(values[8]),
    completedAt: Number(values[9]),
    status: Number(values[10]),
  };
}