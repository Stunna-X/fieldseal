import {
  useCallback,
  useEffect,
  useMemo,
  useState,
} from "react";
import {
  AlertTriangle,
  ArrowUpRight,
  Check,
  CheckCircle2,
  CircleDollarSign,
  ClipboardCheck,
  Copy,
  ExternalLink,
  FileCheck2,
  Hammer,
  LoaderCircle,
  LockKeyhole,
  LogOut,
  Plus,
  RefreshCw,
  ShieldCheck,
  Upload,
  Wallet,
  X,
} from "lucide-react";
import {
  useAccount,
  useConnect,
  useDisconnect,
  useSwitchChain,
  useWriteContract,
} from "wagmi";
import {
  formatEther,
  isAddress,
  keccak256,
  parseEther,
  stringToHex,
} from "viem";

import {
  FIELDSEAL_ADDRESS,
  JOB_STATUS,
  JOB_STATUS_META,
  fieldSealAbi,
  normalizeJob,
} from "./contracts/fieldSeal.js";
import {
  monadTestnet,
  publicClient,
} from "./config/wagmi.js";

const ZERO_ADDRESS =
  "0x0000000000000000000000000000000000000000";

function formatAddress(address) {
  if (!address) {
    return "Not connected";
  }

  return `${address.slice(0, 6)}…${address.slice(-4)}`;
}

function formatMon(value) {
  if (typeof value !== "bigint") {
    return "0";
  }

  const amount = Number(formatEther(value));

  return amount.toLocaleString(undefined, {
    minimumFractionDigits: 0,
    maximumFractionDigits: amount >= 1 ? 4 : 6,
  });
}

function formatTimestamp(timestamp) {
  if (!timestamp) {
    return "Pending";
  }

  return new Date(timestamp * 1_000).toLocaleString(undefined, {
    dateStyle: "medium",
    timeStyle: "short",
  });
}

function sameAddress(first, second) {
  return Boolean(
    first &&
      second &&
      first.toLowerCase() === second.toLowerCase(),
  );
}

function getErrorMessage(error) {
  const rawMessage =
    error?.shortMessage ||
    error?.cause?.shortMessage ||
    error?.details ||
    error?.message ||
    "Something went wrong.";

  if (
    rawMessage.toLowerCase().includes("user rejected") ||
    rawMessage.toLowerCase().includes("user denied")
  ) {
    return "The transaction was rejected in your wallet.";
  }

  if (rawMessage.toLowerCase().includes("insufficient funds")) {
    return "This wallet does not have enough testnet MON.";
  }

  return rawMessage.split("\n")[0];
}

function StatusBadge({ status }) {
  const metadata =
    JOB_STATUS_META[status] ||
    JOB_STATUS_META[JOB_STATUS.FUNDED];

  return (
    <span className={`status-badge ${metadata.className}`}>
      <span className="status-dot" />
      {metadata.label}
    </span>
  );
}

function JobTimeline({ status }) {
  const proofReached =
    status === JOB_STATUS.SUBMITTED ||
    status === JOB_STATUS.COMPLETED;

  const paymentReached =
    status === JOB_STATUS.COMPLETED;

  const cancelled =
    status === JOB_STATUS.CANCELLED;

  return (
    <div className="job-timeline">
      <div className="timeline-step timeline-step-active">
        <span className="timeline-marker">
          <Check size={13} />
        </span>
        <span>Funded</span>
      </div>

      <span
        className={`timeline-line ${
          proofReached ? "timeline-line-active" : ""
        }`}
      />

      <div
        className={`timeline-step ${
          proofReached ? "timeline-step-active" : ""
        }`}
      >
        <span className="timeline-marker">
          {proofReached ? <Check size={13} /> : "2"}
        </span>
        <span>Proof</span>
      </div>

      <span
        className={`timeline-line ${
          paymentReached || cancelled
            ? "timeline-line-active"
            : ""
        }`}
      />

      <div
        className={`timeline-step ${
          paymentReached || cancelled
            ? "timeline-step-active"
            : ""
        }`}
      >
        <span className="timeline-marker">
          {paymentReached || cancelled ? (
            <Check size={13} />
          ) : (
            "3"
          )}
        </span>
        <span>{cancelled ? "Refunded" : "Paid"}</span>
      </div>
    </div>
  );
}

function PartyRow({
  label,
  address,
  currentAddress,
}) {
  const isCurrentWallet =
    sameAddress(address, currentAddress);

  return (
    <div className="party-row">
      <span>{label}</span>

      <strong title={address}>
        {formatAddress(address)}
        {isCurrentWallet && (
          <em>Your wallet</em>
        )}
      </strong>
    </div>
  );
}

function JobCard({
  job,
  currentAddress,
  activeEvidenceJobId,
  evidenceNote,
  evidenceFile,
  busy,
  copiedValue,
  onCopy,
  onToggleEvidence,
  onEvidenceNoteChange,
  onEvidenceFileChange,
  onSubmitEvidence,
  onApprove,
  onCancel,
}) {
  const isClient =
    sameAddress(job.client, currentAddress);

  const isWorker =
    sameAddress(job.worker, currentAddress);

  const canSubmit =
    isWorker &&
    job.status === JOB_STATUS.FUNDED;

  const canApprove =
    isClient &&
    job.status === JOB_STATUS.SUBMITTED;

  const canCancel =
    isClient &&
    job.status === JOB_STATUS.FUNDED;

  const evidenceOpen =
    activeEvidenceJobId === job.id;

  const role = isClient ? "Client" : "Worker";

  return (
    <article className="job-card">
      <div className="job-card-top">
        <div>
          <span className="job-number">
            JOB #{String(job.id).padStart(3, "0")}
          </span>

          <span className="role-badge">
            {role}
          </span>
        </div>

        <StatusBadge status={job.status} />
      </div>

      <h3>{job.description}</h3>

      <div className="job-amount">
        <CircleDollarSign size={19} />
        <strong>{formatMon(job.amount)} MON</strong>
        <span>secured in contract</span>
      </div>

      <JobTimeline status={job.status} />

      <div className="job-details">
        <PartyRow
          label="Client"
          address={job.client}
          currentAddress={currentAddress}
        />

        <PartyRow
          label="Worker"
          address={job.worker}
          currentAddress={currentAddress}
        />

        <div className="party-row">
          <span>Created</span>
          <strong>{formatTimestamp(job.createdAt)}</strong>
        </div>
      </div>

      {(job.status === JOB_STATUS.SUBMITTED ||
        job.status === JOB_STATUS.COMPLETED) && (
        <div className="evidence-summary">
          <div className="evidence-summary-heading">
            <FileCheck2 size={17} />
            <strong>Completion proof</strong>
          </div>

          <p>{job.evidenceNote}</p>

          <div className="hash-row">
            <code title={job.evidenceHash}>
              {formatAddress(job.evidenceHash)}
            </code>

            <button
              type="button"
              className="copy-button"
              onClick={() =>
                onCopy(job.evidenceHash)
              }
              aria-label="Copy evidence hash"
            >
              {copiedValue === job.evidenceHash ? (
                <Check size={15} />
              ) : (
                <Copy size={15} />
              )}
            </button>
          </div>
        </div>
      )}

      {evidenceOpen && canSubmit && (
        <form
          className="evidence-form"
          onSubmit={(event) =>
            onSubmitEvidence(event, job.id)
          }
        >
          <div className="evidence-form-heading">
            <div>
              <strong>Submit completion proof</strong>
              <span>
                Your file is hashed locally and never uploaded.
              </span>
            </div>

            <button
              type="button"
              className="icon-button icon-button-small"
              onClick={() =>
                onToggleEvidence(job.id)
              }
              aria-label="Close evidence form"
            >
              <X size={16} />
            </button>
          </div>

          <label className="field-group">
            <span>Completion note</span>
            <textarea
              value={evidenceNote}
              onChange={(event) =>
                onEvidenceNoteChange(
                  event.target.value,
                )
              }
              maxLength={240}
              rows={3}
              placeholder="Describe what was completed and tested."
              required
            />
          </label>

          <label className="file-field">
            <Upload size={17} />

            <span>
              {evidenceFile
                ? evidenceFile.name
                : "Attach optional photo or document"}
              <small>
                Only its cryptographic fingerprint is stored.
              </small>
            </span>

            <input
              type="file"
              accept="image/*,.pdf,.txt"
              onChange={(event) =>
                onEvidenceFileChange(
                  event.target.files?.[0] || null,
                )
              }
            />
          </label>

          <button
            type="submit"
            className="button button-primary button-full"
            disabled={busy}
          >
            {busy ? (
              <LoaderCircle
                className="spinner"
                size={17}
              />
            ) : (
              <ClipboardCheck size={17} />
            )}
            Seal completion proof
          </button>
        </form>
      )}

      <div className="job-actions">
        {canSubmit && (
          <button
            type="button"
            className="button button-secondary"
            onClick={() =>
              onToggleEvidence(job.id)
            }
            disabled={busy}
          >
            <ClipboardCheck size={17} />
            {evidenceOpen
              ? "Close proof form"
              : "Submit proof"}
          </button>
        )}

        {canApprove && (
          <button
            type="button"
            className="button button-primary"
            onClick={() => onApprove(job)}
            disabled={busy}
          >
            <CheckCircle2 size={17} />
            Approve and release
          </button>
        )}

        {canCancel && (
          <button
            type="button"
            className="button button-danger"
            onClick={() => onCancel(job)}
            disabled={busy}
          >
            <X size={17} />
            Cancel and refund
          </button>
        )}

        {!canSubmit &&
          !canApprove &&
          !canCancel && (
            <span className="job-action-note">
              {job.status === JOB_STATUS.COMPLETED &&
                "Payment released to the worker."}

              {job.status === JOB_STATUS.CANCELLED &&
                "Escrow returned to the client."}

              {job.status === JOB_STATUS.SUBMITTED &&
                isWorker &&
                "Waiting for client approval."}
            </span>
          )}
      </div>
    </article>
  );
}

function App() {
  const account = useAccount();
  const connect = useConnect();
  const disconnect = useDisconnect();
  const switchChain = useSwitchChain();
  const writeContract = useWriteContract();

  const [jobs, setJobs] = useState([]);
  const [loadingJobs, setLoadingJobs] =
    useState(false);

  const [stats, setStats] = useState({
    totalCreated: 0,
    walletBalance: 0n,
  });

  const [filter, setFilter] = useState("all");

  const [workerAddress, setWorkerAddress] =
    useState("");

  const [jobDescription, setJobDescription] =
    useState("");

  const [paymentAmount, setPaymentAmount] =
    useState("0.05");

  const [
    activeEvidenceJobId,
    setActiveEvidenceJobId,
  ] = useState(null);

  const [evidenceNote, setEvidenceNote] =
    useState("");

  const [evidenceFile, setEvidenceFile] =
    useState(null);

  const [notice, setNotice] = useState(null);
  const [copiedValue, setCopiedValue] =
    useState("");

  const [transaction, setTransaction] =
    useState({
      status: "idle",
      label: "",
      hash: "",
    });

  const isCorrectNetwork =
    account.chainId === monadTestnet.id;

  const transactionBusy =
    transaction.status === "signing" ||
    transaction.status === "confirming" ||
    writeContract.isPending;

  const loadJobs = useCallback(async () => {
    if (!account.address) {
      setJobs([]);
      setStats({
        totalCreated: 0,
        walletBalance: 0n,
      });
      return;
    }

    setLoadingJobs(true);

    try {
      const [
        clientIds,
        workerIds,
        nextJobId,
        walletBalance,
      ] = await Promise.all([
        publicClient.readContract({
          address: FIELDSEAL_ADDRESS,
          abi: fieldSealAbi,
          functionName: "getClientJobIds",
          args: [account.address],
        }),

        publicClient.readContract({
          address: FIELDSEAL_ADDRESS,
          abi: fieldSealAbi,
          functionName: "getWorkerJobIds",
          args: [account.address],
        }),

        publicClient.readContract({
          address: FIELDSEAL_ADDRESS,
          abi: fieldSealAbi,
          functionName: "nextJobId",
        }),

        publicClient.getBalance({
          address: account.address,
        }),
      ]);

      const uniqueIds = [
        ...new Map(
          [...clientIds, ...workerIds].map(
            (jobId) => [
              jobId.toString(),
              jobId,
            ],
          ),
        ).values(),
      ];

      const loadedJobs = await Promise.all(
        uniqueIds.map((jobId) =>
          publicClient.readContract({
            address: FIELDSEAL_ADDRESS,
            abi: fieldSealAbi,
            functionName: "getJob",
            args: [jobId],
          }),
        ),
      );

      setJobs(
        loadedJobs
          .map(normalizeJob)
          .sort((first, second) =>
            second.id - first.id,
          ),
      );

      setStats({
        totalCreated: Math.max(
          0,
          Number(nextJobId) - 1,
        ),
        walletBalance,
      });
    } catch (error) {
      setNotice({
        type: "error",
        message: getErrorMessage(error),
      });
    } finally {
      setLoadingJobs(false);
    }
  }, [account.address]);

  useEffect(() => {
    loadJobs();
  }, [loadJobs]);

  useEffect(() => {
    setActiveEvidenceJobId(null);
    setEvidenceNote("");
    setEvidenceFile(null);
  }, [account.address]);

  const filteredJobs = useMemo(() => {
    if (filter === "client") {
      return jobs.filter((job) =>
        sameAddress(
          job.client,
          account.address,
        ),
      );
    }

    if (filter === "worker") {
      return jobs.filter((job) =>
        sameAddress(
          job.worker,
          account.address,
        ),
      );
    }

    return jobs;
  }, [account.address, filter, jobs]);

  const activeEscrow = useMemo(
    () =>
      jobs
        .filter(
          (job) =>
            job.status === JOB_STATUS.FUNDED ||
            job.status === JOB_STATUS.SUBMITTED,
        )
        .reduce(
          (total, job) => total + job.amount,
          0n,
        ),
    [jobs],
  );

  const completedJobs = useMemo(
    () =>
      jobs.filter(
        (job) =>
          job.status === JOB_STATUS.COMPLETED,
      ).length,
    [jobs],
  );

  async function handleConnect() {
    setNotice(null);

    const connector = connect.connectors[0];

    if (!connector) {
      setNotice({
        type: "error",
        message:
          "No compatible browser wallet was detected.",
      });
      return;
    }

    try {
      await connect.mutateAsync({
        connector,
        chainId: monadTestnet.id,
      });
    } catch (error) {
      setNotice({
        type: "error",
        message: getErrorMessage(error),
      });
    }
  }

  async function handleSwitchNetwork() {
    setNotice(null);

    try {
      await switchChain.mutateAsync({
        chainId: monadTestnet.id,
      });
    } catch (error) {
      setNotice({
        type: "error",
        message: getErrorMessage(error),
      });
    }
  }

  async function ensureMonadNetwork() {
    if (!account.isConnected) {
      throw new Error(
        "Connect your wallet before continuing.",
      );
    }

    if (account.chainId !== monadTestnet.id) {
      await switchChain.mutateAsync({
        chainId: monadTestnet.id,
      });
    }
  }

  async function executeContractTransaction({
    label,
    functionName,
    args,
    value,
    successMessage,
  }) {
    setNotice(null);
    setTransaction({
      status: "signing",
      label,
      hash: "",
    });

    try {
      await ensureMonadNetwork();

      const request = {
        address: FIELDSEAL_ADDRESS,
        abi: fieldSealAbi,
        functionName,
        args,
        chainId: monadTestnet.id,
      };

      if (typeof value === "bigint") {
        request.value = value;
      }

      const hash =
        await writeContract.mutateAsync(request);

      setTransaction({
        status: "confirming",
        label,
        hash,
      });

      const receipt =
        await publicClient.waitForTransactionReceipt({
          hash,
          confirmations: 1,
        });

      if (receipt.status !== "success") {
        throw new Error(
          "The transaction reverted onchain.",
        );
      }

      await loadJobs();

      setTransaction({
        status: "confirmed",
        label,
        hash,
      });

      setNotice({
        type: "success",
        message: successMessage,
      });

      return hash;
    } catch (error) {
      setTransaction({
        status: "failed",
        label,
        hash: "",
      });

      setNotice({
        type: "error",
        message: getErrorMessage(error),
      });

      throw error;
    }
  }

  async function handleCreateJob(event) {
    event.preventDefault();

    const normalizedWorker =
      workerAddress.trim();

    const normalizedDescription =
      jobDescription.trim();

    if (
      !isAddress(normalizedWorker) ||
      normalizedWorker === ZERO_ADDRESS
    ) {
      setNotice({
        type: "error",
        message:
          "Enter a valid worker wallet address.",
      });
      return;
    }

    if (
      sameAddress(
        normalizedWorker,
        account.address,
      )
    ) {
      setNotice({
        type: "error",
        message:
          "The worker must use a different wallet from the client.",
      });
      return;
    }

    if (!normalizedDescription) {
      setNotice({
        type: "error",
        message:
          "Describe the work being funded.",
      });
      return;
    }

    let value;

    try {
      value = parseEther(paymentAmount);
    } catch {
      setNotice({
        type: "error",
        message:
          "Enter a valid MON payment amount.",
      });
      return;
    }

    if (value <= 0n) {
      setNotice({
        type: "error",
        message:
          "The payment amount must be greater than zero.",
      });
      return;
    }

    try {
      await executeContractTransaction({
        label: "Creating funded job",
        functionName: "createJob",
        args: [
          normalizedWorker,
          normalizedDescription,
        ],
        value,
        successMessage:
          "Job funded and sealed on Monad Testnet.",
      });

      setWorkerAddress("");
      setJobDescription("");
      setPaymentAmount("0.05");
    } catch {
      // Error state is handled centrally.
    }
  }

  async function handleSubmitEvidence(
    event,
    jobId,
  ) {
    event.preventDefault();

    const normalizedNote =
      evidenceNote.trim();

    if (!normalizedNote) {
      setNotice({
        type: "error",
        message:
          "Add a completion note before submitting proof.",
      });
      return;
    }

    try {
      let evidenceHash;

      if (evidenceFile) {
        const fileBytes = new Uint8Array(
          await evidenceFile.arrayBuffer(),
        );

        evidenceHash = keccak256(fileBytes);
      } else {
        evidenceHash = keccak256(
          stringToHex(normalizedNote),
        );
      }

      await executeContractTransaction({
        label: `Submitting proof for job #${jobId}`,
        functionName: "submitEvidence",
        args: [
          BigInt(jobId),
          normalizedNote,
          evidenceHash,
        ],
        successMessage:
          "Completion proof sealed onchain.",
      });

      setActiveEvidenceJobId(null);
      setEvidenceNote("");
      setEvidenceFile(null);
    } catch {
      // Error state is handled centrally.
    }
  }

  async function handleApprove(job) {
    const approved = window.confirm(
      `Release ${formatMon(
        job.amount,
      )} MON to ${formatAddress(job.worker)}?`,
    );

    if (!approved) {
      return;
    }

    try {
      await executeContractTransaction({
        label: `Releasing payment for job #${job.id}`,
        functionName: "approveAndRelease",
        args: [BigInt(job.id)],
        successMessage:
          "Work approved and payment released.",
      });
    } catch {
      // Error state is handled centrally.
    }
  }

  async function handleCancel(job) {
    const confirmed = window.confirm(
      `Cancel job #${job.id} and return ${formatMon(
        job.amount,
      )} MON to your wallet?`,
    );

    if (!confirmed) {
      return;
    }

    try {
      await executeContractTransaction({
        label: `Cancelling job #${job.id}`,
        functionName: "cancelJob",
        args: [BigInt(job.id)],
        successMessage:
          "Job cancelled and escrow refunded.",
      });
    } catch {
      // Error state is handled centrally.
    }
  }

  async function copyValue(value) {
    try {
      await navigator.clipboard.writeText(value);
      setCopiedValue(value);

      window.setTimeout(() => {
        setCopiedValue("");
      }, 1_500);
    } catch {
      setNotice({
        type: "error",
        message:
          "The browser could not copy this value.",
      });
    }
  }

  function toggleEvidenceForm(jobId) {
    if (activeEvidenceJobId === jobId) {
      setActiveEvidenceJobId(null);
      setEvidenceNote("");
      setEvidenceFile(null);
      return;
    }

    setActiveEvidenceJobId(jobId);
    setEvidenceNote("");
    setEvidenceFile(null);
  }

  function handleDisconnect() {
    disconnect.mutate();

    setJobs([]);
    setFilter("all");
    setNotice(null);
    setTransaction({
      status: "idle",
      label: "",
      hash: "",
    });
  }

  const contractExplorerUrl =
    `${monadTestnet.blockExplorers.default.url}/address/${FIELDSEAL_ADDRESS}`;

  const transactionExplorerUrl =
    transaction.hash
      ? `${monadTestnet.blockExplorers.default.url}/tx/${transaction.hash}`
      : "";

  return (
    <div className="app-shell">
      <header className="topbar">
        <a
          className="brand"
          href="/"
          aria-label="FieldSeal home"
        >
          <span className="brand-mark">
            <ShieldCheck size={21} />
          </span>

          <span>
            FieldSeal
            <small>MONAD TESTNET</small>
          </span>
        </a>

        <div className="topbar-actions">
          <span className="network-pill">
            <span />
            Monad Testnet
          </span>

          {account.isConnected ? (
            <div className="wallet-controls">
              {!isCorrectNetwork && (
                <button
                  type="button"
                  className="button button-warning"
                  onClick={handleSwitchNetwork}
                  disabled={switchChain.isPending}
                >
                  <AlertTriangle size={16} />
                  Switch network
                </button>
              )}

              <button
                type="button"
                className="wallet-address"
                onClick={() =>
                  copyValue(account.address)
                }
                title="Copy wallet address"
              >
                <Wallet size={16} />
                {formatAddress(account.address)}

                {copiedValue === account.address ? (
                  <Check size={14} />
                ) : (
                  <Copy size={14} />
                )}
              </button>

              <button
                type="button"
                className="icon-button"
                onClick={handleDisconnect}
                aria-label="Disconnect wallet"
                title="Disconnect wallet"
              >
                <LogOut size={17} />
              </button>
            </div>
          ) : (
            <button
              type="button"
              className="button button-primary"
              onClick={handleConnect}
              disabled={connect.isPending}
            >
              {connect.isPending ? (
                <LoaderCircle
                  className="spinner"
                  size={17}
                />
              ) : (
                <Wallet size={17} />
              )}
              Connect wallet
            </button>
          )}
        </div>
      </header>

      <main className="page-content">
        <section className="hero-grid">
          <article className="hero-panel">
            <div className="eyebrow">
              <span className="eyebrow-icon">
                <LockKeyhole size={14} />
              </span>
              LIVE JOB ESCROW
            </div>

            <h1>
              Finish the work.
              <span>Seal the payment.</span>
            </h1>

            <p className="hero-copy">
              FieldSeal locks a field-job payment,
              records a private evidence fingerprint,
              and releases funds only after the client
              approves the completed work.
            </p>

            <div className="hero-proof-grid">
              <div>
                <LockKeyhole size={18} />
                <span>
                  <strong>Funded first</strong>
                  Payment is locked before work begins.
                </span>
              </div>

              <div>
                <FileCheck2 size={18} />
                <span>
                  <strong>Proof, not promises</strong>
                  Evidence receives an onchain fingerprint.
                </span>
              </div>

              <div>
                <CircleDollarSign size={18} />
                <span>
                  <strong>Approval releases</strong>
                  The contract pays the assigned worker.
                </span>
              </div>
            </div>

            <div className="contract-strip">
              <span>
                <ShieldCheck size={15} />
                Deployed contract
              </span>

              <code>{formatAddress(FIELDSEAL_ADDRESS)}</code>

              <button
                type="button"
                onClick={() =>
                  copyValue(FIELDSEAL_ADDRESS)
                }
                aria-label="Copy contract address"
              >
                {copiedValue === FIELDSEAL_ADDRESS ? (
                  <Check size={15} />
                ) : (
                  <Copy size={15} />
                )}
              </button>

              <a
                href={contractExplorerUrl}
                target="_blank"
                rel="noreferrer"
                aria-label="Open contract in explorer"
              >
                <ExternalLink size={15} />
              </a>
            </div>

            <div className="seal-graphic">
              <span className="seal-ring seal-ring-one" />
              <span className="seal-ring seal-ring-two" />

              <span className="seal-core">
                <ShieldCheck size={30} />
              </span>
            </div>
          </article>

          <aside className="create-panel">
            <div className="panel-heading">
              <div>
                <span>CLIENT ACTION</span>
                <h2>Create a funded job</h2>
              </div>

              <span className="step-chip">
                <Plus size={15} />
                New escrow
              </span>
            </div>

            {!account.isConnected ? (
              <div className="connect-gate">
                <span>
                  <Wallet size={24} />
                </span>

                <h3>Connect your client wallet</h3>

                <p>
                  Your wallet creates the job and locks
                  testnet MON inside the FieldSeal contract.
                </p>

                <button
                  type="button"
                  className="button button-primary button-full"
                  onClick={handleConnect}
                  disabled={connect.isPending}
                >
                  {connect.isPending ? (
                    <LoaderCircle
                      className="spinner"
                      size={17}
                    />
                  ) : (
                    <Wallet size={17} />
                  )}
                  Connect wallet
                </button>
              </div>
            ) : (
              <form
                className="create-form"
                onSubmit={handleCreateJob}
              >
                <label className="field-group">
                  <span>Worker wallet</span>
                  <input
                    type="text"
                    value={workerAddress}
                    onChange={(event) =>
                      setWorkerAddress(
                        event.target.value,
                      )
                    }
                    placeholder="0x..."
                    autoComplete="off"
                    spellCheck="false"
                    required
                  />
                  <small>
                    Use a second wallet for the worker demo.
                  </small>
                </label>

                <label className="field-group">
                  <span>Job description</span>
                  <textarea
                    value={jobDescription}
                    onChange={(event) =>
                      setJobDescription(
                        event.target.value,
                      )
                    }
                    placeholder="Install and pressure-test the borehole pump."
                    maxLength={180}
                    rows={4}
                    required
                  />
                  <small className="character-count">
                    {jobDescription.length}/180
                  </small>
                </label>

                <label className="field-group">
                  <span>Escrow payment</span>

                  <div className="input-with-suffix">
                    <input
                      type="number"
                      value={paymentAmount}
                      onChange={(event) =>
                        setPaymentAmount(
                          event.target.value,
                        )
                      }
                      min="0.000001"
                      step="0.000001"
                      inputMode="decimal"
                      required
                    />

                    <strong>MON</strong>
                  </div>

                  <small>
                    Testnet tokens only. No real money.
                  </small>
                </label>

                {!isCorrectNetwork && (
                  <button
                    type="button"
                    className="network-warning"
                    onClick={handleSwitchNetwork}
                  >
                    <AlertTriangle size={16} />
                    Switch to Monad Testnet before signing
                  </button>
                )}

                <button
                  type="submit"
                  className="button button-primary button-full"
                  disabled={transactionBusy}
                >
                  {transactionBusy ? (
                    <LoaderCircle
                      className="spinner"
                      size={17}
                    />
                  ) : (
                    <LockKeyhole size={17} />
                  )}
                  Fund and create job
                </button>
              </form>
            )}
          </aside>
        </section>

        {notice && (
          <div
            className={`notice notice-${notice.type}`}
            role="alert"
          >
            {notice.type === "success" ? (
              <CheckCircle2 size={19} />
            ) : (
              <AlertTriangle size={19} />
            )}

            <span>{notice.message}</span>

            <button
              type="button"
              onClick={() => setNotice(null)}
              aria-label="Dismiss message"
            >
              <X size={16} />
            </button>
          </div>
        )}

        {transaction.status !== "idle" && (
          <div
            className={`transaction-banner transaction-${transaction.status}`}
            aria-live="polite"
          >
            <div className="transaction-icon">
              {transaction.status === "signing" ||
              transaction.status === "confirming" ? (
                <LoaderCircle
                  className="spinner"
                  size={19}
                />
              ) : transaction.status === "confirmed" ? (
                <CheckCircle2 size={19} />
              ) : (
                <AlertTriangle size={19} />
              )}
            </div>

            <div>
              <strong>{transaction.label}</strong>

              <span>
                {transaction.status === "signing" &&
                  "Confirm the transaction in your wallet."}

                {transaction.status === "confirming" &&
                  "Transaction sent. Waiting for Monad confirmation."}

                {transaction.status === "confirmed" &&
                  "Transaction confirmed on Monad Testnet."}

                {transaction.status === "failed" &&
                  "The transaction did not complete."}
              </span>
            </div>

            {transaction.hash && (
              <a
                href={transactionExplorerUrl}
                target="_blank"
                rel="noreferrer"
              >
                View transaction
                <ArrowUpRight size={15} />
              </a>
            )}
          </div>
        )}

        {account.isConnected ? (
          <>
            <section className="stats-grid">
              <div className="stat-card">
                <span className="stat-icon">
                  <Hammer size={18} />
                </span>

                <div>
                  <span>Jobs on contract</span>
                  <strong>{stats.totalCreated}</strong>
                </div>
              </div>

              <div className="stat-card">
                <span className="stat-icon">
                  <ClipboardCheck size={18} />
                </span>

                <div>
                  <span>My jobs</span>
                  <strong>{jobs.length}</strong>
                </div>
              </div>

              <div className="stat-card">
                <span className="stat-icon">
                  <LockKeyhole size={18} />
                </span>

                <div>
                  <span>My active escrow</span>
                  <strong>
                    {formatMon(activeEscrow)} MON
                  </strong>
                </div>
              </div>

              <div className="stat-card">
                <span className="stat-icon">
                  <Wallet size={18} />
                </span>

                <div>
                  <span>Wallet balance</span>
                  <strong>
                    {formatMon(stats.walletBalance)} MON
                  </strong>
                </div>
              </div>
            </section>

            <section className="jobs-section">
              <div className="section-heading">
                <div>
                  <span>LIVE CONTRACT DATA</span>
                  <h2>My FieldSeal jobs</h2>
                  <p>
                    {completedJobs} completed job
                    {completedJobs === 1 ? "" : "s"} for
                    this connected wallet.
                  </p>
                </div>

                <div className="section-controls">
                  <div className="filter-tabs">
                    {[
                      ["all", "All"],
                      ["client", "As client"],
                      ["worker", "As worker"],
                    ].map(([value, label]) => (
                      <button
                        type="button"
                        key={value}
                        className={
                          filter === value
                            ? "filter-active"
                            : ""
                        }
                        onClick={() =>
                          setFilter(value)
                        }
                      >
                        {label}
                      </button>
                    ))}
                  </div>

                  <button
                    type="button"
                    className="icon-button"
                    onClick={loadJobs}
                    disabled={loadingJobs}
                    aria-label="Refresh jobs"
                    title="Refresh jobs"
                  >
                    <RefreshCw
                      size={17}
                      className={
                        loadingJobs ? "spinner" : ""
                      }
                    />
                  </button>
                </div>
              </div>

              {loadingJobs && jobs.length === 0 ? (
                <div className="loading-state">
                  <LoaderCircle
                    className="spinner"
                    size={26}
                  />
                  Reading jobs from Monad Testnet…
                </div>
              ) : filteredJobs.length > 0 ? (
                <div className="job-grid">
                  {filteredJobs.map((job) => (
                    <JobCard
                      key={job.id}
                      job={job}
                      currentAddress={account.address}
                      activeEvidenceJobId={
                        activeEvidenceJobId
                      }
                      evidenceNote={evidenceNote}
                      evidenceFile={evidenceFile}
                      busy={transactionBusy}
                      copiedValue={copiedValue}
                      onCopy={copyValue}
                      onToggleEvidence={
                        toggleEvidenceForm
                      }
                      onEvidenceNoteChange={
                        setEvidenceNote
                      }
                      onEvidenceFileChange={
                        setEvidenceFile
                      }
                      onSubmitEvidence={
                        handleSubmitEvidence
                      }
                      onApprove={handleApprove}
                      onCancel={handleCancel}
                    />
                  ))}
                </div>
              ) : (
                <div className="empty-state">
                  <span>
                    <Hammer size={25} />
                  </span>

                  <h3>
                    {jobs.length === 0
                      ? "No jobs for this wallet yet"
                      : "No jobs match this filter"}
                  </h3>

                  <p>
                    {jobs.length === 0
                      ? "Create a funded job above or connect the assigned worker wallet."
                      : "Choose another role filter to see your remaining jobs."}
                  </p>
                </div>
              )}
            </section>
          </>
        ) : (
          <section className="workflow-section">
            <div className="section-heading">
              <div>
                <span>ONE COMPLETE WORKFLOW</span>
                <h2>From agreement to verified payment</h2>
              </div>
            </div>

            <div className="workflow-grid">
              <article>
                <span>01</span>
                <LockKeyhole size={23} />
                <h3>Client funds the job</h3>
                <p>
                  The payment is locked inside the
                  FieldSeal contract before work starts.
                </p>
              </article>

              <article>
                <span>02</span>
                <FileCheck2 size={23} />
                <h3>Worker seals proof</h3>
                <p>
                  A completion note and evidence fingerprint
                  are permanently attached to the job.
                </p>
              </article>

              <article>
                <span>03</span>
                <CircleDollarSign size={23} />
                <h3>Approval releases MON</h3>
                <p>
                  The client approves the proof and the
                  contract pays the assigned worker.
                </p>
              </article>
            </div>
          </section>
        )}
      </main>

      <footer className="footer">
        <span>
          <ShieldCheck size={15} />
          FieldSeal
        </span>

        <p>
          Built on Monad Testnet. Testnet MON has no
          monetary value.
        </p>

        <a
          href={contractExplorerUrl}
          target="_blank"
          rel="noreferrer"
        >
          Contract
          <ArrowUpRight size={14} />
        </a>
      </footer>
    </div>
  );
}

export default App;