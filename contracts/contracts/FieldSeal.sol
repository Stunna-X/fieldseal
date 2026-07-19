// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

/**
 * @title FieldSeal
 * @notice Onchain escrow for field jobs.
 *
 * A client creates and funds a job for a worker.
 * The worker submits proof of completion.
 * The client approves the work and releases payment.
 */
contract FieldSeal {
    enum JobStatus {
        Funded,
        Submitted,
        Completed,
        Cancelled
    }

    struct Job {
        uint256 id;
        address client;
        address worker;
        uint256 amount;
        string description;
        string evidenceNote;
        bytes32 evidenceHash;
        uint64 createdAt;
        uint64 submittedAt;
        uint64 completedAt;
        JobStatus status;
    }

    error ZeroAddress();
    error InvalidAmount();
    error EmptyDescription();
    error EmptyEvidence();
    error SameParticipant();
    error JobNotFound();
    error Unauthorized();
    error TransferFailed();
    error Reentrancy();
    error InvalidStatus(JobStatus expected, JobStatus actual);

    event JobCreated(
        uint256 indexed jobId,
        address indexed client,
        address indexed worker,
        uint256 amount,
        string description
    );

    event EvidenceSubmitted(
        uint256 indexed jobId,
        address indexed worker,
        string evidenceNote,
        bytes32 evidenceHash
    );

    event JobCompleted(
        uint256 indexed jobId,
        address indexed client,
        address indexed worker,
        uint256 amount
    );

    event JobCancelled(
        uint256 indexed jobId,
        address indexed client,
        uint256 refundedAmount
    );

    uint256 public nextJobId = 1;

    mapping(uint256 => Job) private jobs;
    mapping(address => uint256[]) private clientJobIds;
    mapping(address => uint256[]) private workerJobIds;

    uint256 private reentrancyState = 1;

    modifier nonReentrant() {
        if (reentrancyState != 1) {
            revert Reentrancy();
        }

        reentrancyState = 2;
        _;
        reentrancyState = 1;
    }

    modifier jobExists(uint256 jobId) {
        if (jobs[jobId].client == address(0)) {
            revert JobNotFound();
        }

        _;
    }

    function createJob(
        address worker,
        string calldata description
    )
        external
        payable
        returns (uint256 jobId)
    {
        if (worker == address(0)) {
            revert ZeroAddress();
        }

        if (worker == msg.sender) {
            revert SameParticipant();
        }

        if (msg.value == 0) {
            revert InvalidAmount();
        }

        if (bytes(description).length == 0) {
            revert EmptyDescription();
        }

        jobId = nextJobId;
        nextJobId++;

        jobs[jobId] = Job({
            id: jobId,
            client: msg.sender,
            worker: worker,
            amount: msg.value,
            description: description,
            evidenceNote: "",
            evidenceHash: bytes32(0),
            createdAt: uint64(block.timestamp),
            submittedAt: 0,
            completedAt: 0,
            status: JobStatus.Funded
        });

        clientJobIds[msg.sender].push(jobId);
        workerJobIds[worker].push(jobId);

        emit JobCreated(
            jobId,
            msg.sender,
            worker,
            msg.value,
            description
        );
    }

    function submitEvidence(
        uint256 jobId,
        string calldata evidenceNote,
        bytes32 evidenceHash
    )
        external
        jobExists(jobId)
    {
        Job storage job = jobs[jobId];

        if (msg.sender != job.worker) {
            revert Unauthorized();
        }

        if (job.status != JobStatus.Funded) {
            revert InvalidStatus(
                JobStatus.Funded,
                job.status
            );
        }

        if (
            bytes(evidenceNote).length == 0 ||
            evidenceHash == bytes32(0)
        ) {
            revert EmptyEvidence();
        }

        job.evidenceNote = evidenceNote;
        job.evidenceHash = evidenceHash;
        job.submittedAt = uint64(block.timestamp);
        job.status = JobStatus.Submitted;

        emit EvidenceSubmitted(
            jobId,
            msg.sender,
            evidenceNote,
            evidenceHash
        );
    }

    function approveAndRelease(
        uint256 jobId
    )
        external
        nonReentrant
        jobExists(jobId)
    {
        Job storage job = jobs[jobId];

        if (msg.sender != job.client) {
            revert Unauthorized();
        }

        if (job.status != JobStatus.Submitted) {
            revert InvalidStatus(
                JobStatus.Submitted,
                job.status
            );
        }

        job.status = JobStatus.Completed;
        job.completedAt = uint64(block.timestamp);

        uint256 paymentAmount = job.amount;

        (bool success, ) = payable(job.worker).call{
            value: paymentAmount
        }("");

        if (!success) {
            revert TransferFailed();
        }

        emit JobCompleted(
            jobId,
            job.client,
            job.worker,
            paymentAmount
        );
    }

    function cancelJob(
        uint256 jobId
    )
        external
        nonReentrant
        jobExists(jobId)
    {
        Job storage job = jobs[jobId];

        if (msg.sender != job.client) {
            revert Unauthorized();
        }

        if (job.status != JobStatus.Funded) {
            revert InvalidStatus(
                JobStatus.Funded,
                job.status
            );
        }

        job.status = JobStatus.Cancelled;
        job.completedAt = uint64(block.timestamp);

        uint256 refundAmount = job.amount;

        (bool success, ) = payable(job.client).call{
            value: refundAmount
        }("");

        if (!success) {
            revert TransferFailed();
        }

        emit JobCancelled(
            jobId,
            job.client,
            refundAmount
        );
    }

    function getJob(
        uint256 jobId
    )
        external
        view
        jobExists(jobId)
        returns (Job memory)
    {
        return jobs[jobId];
    }

    function getClientJobIds(
        address client
    )
        external
        view
        returns (uint256[] memory)
    {
        return clientJobIds[client];
    }

    function getWorkerJobIds(
        address worker
    )
        external
        view
        returns (uint256[] memory)
    {
        return workerJobIds[worker];
    }
}