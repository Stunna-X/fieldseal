// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

import {Test} from "forge-std/Test.sol";
import {FieldSeal} from "./FieldSeal.sol";

contract FieldSealTest is Test {
    FieldSeal private fieldSeal;

    address private client;
    address private worker;
    address private stranger;

    uint256 private constant PAYMENT = 1 ether;

    string private constant JOB_DESCRIPTION =
        "Install and test a borehole water pump";

    string private constant EVIDENCE_NOTE =
        "Pump installed, pressure-tested, and working correctly";

    function setUp() public {
        fieldSeal = new FieldSeal();

        client = makeAddr("client");
        worker = makeAddr("worker");
        stranger = makeAddr("stranger");

        vm.deal(client, 10 ether);
        vm.deal(worker, 1 ether);
        vm.deal(stranger, 1 ether);
    }

    function test_CreateJobLocksPayment() public {
        uint256 jobId = _createJob();

        FieldSeal.Job memory job = fieldSeal.getJob(jobId);

        assertEq(job.id, jobId);
        assertEq(job.client, client);
        assertEq(job.worker, worker);
        assertEq(job.amount, PAYMENT);
        assertEq(job.description, JOB_DESCRIPTION);

        assertEq(
            uint256(job.status),
            uint256(FieldSeal.JobStatus.Funded)
        );

        assertEq(address(fieldSeal).balance, PAYMENT);
        assertEq(fieldSeal.nextJobId(), 2);

        uint256[] memory clientJobs =
            fieldSeal.getClientJobIds(client);

        uint256[] memory workerJobs =
            fieldSeal.getWorkerJobIds(worker);

        assertEq(clientJobs.length, 1);
        assertEq(workerJobs.length, 1);
        assertEq(clientJobs[0], jobId);
        assertEq(workerJobs[0], jobId);
    }

    function test_WorkerCanSubmitEvidence() public {
        uint256 jobId = _createJob();

        bytes32 evidenceHash =
            keccak256(bytes(EVIDENCE_NOTE));

        vm.prank(worker);

        fieldSeal.submitEvidence(
            jobId,
            EVIDENCE_NOTE,
            evidenceHash
        );

        FieldSeal.Job memory job = fieldSeal.getJob(jobId);

        assertEq(job.evidenceNote, EVIDENCE_NOTE);
        assertEq(job.evidenceHash, evidenceHash);

        assertEq(
            uint256(job.status),
            uint256(FieldSeal.JobStatus.Submitted)
        );

        assertGt(job.submittedAt, 0);
    }

    function test_ClientCanApproveAndReleasePayment() public {
        uint256 jobId = _createJob();

        _submitEvidence(jobId);

        uint256 workerBalanceBefore = worker.balance;

        vm.prank(client);
        fieldSeal.approveAndRelease(jobId);

        FieldSeal.Job memory job = fieldSeal.getJob(jobId);

        assertEq(
            uint256(job.status),
            uint256(FieldSeal.JobStatus.Completed)
        );

        assertEq(
            worker.balance,
            workerBalanceBefore + PAYMENT
        );

        assertEq(address(fieldSeal).balance, 0);
        assertGt(job.completedAt, 0);
    }

    function test_ClientCanCancelUnsubmittedJob() public {
        uint256 jobId = _createJob();

        vm.prank(client);
        fieldSeal.cancelJob(jobId);

        FieldSeal.Job memory job = fieldSeal.getJob(jobId);

        assertEq(
            uint256(job.status),
            uint256(FieldSeal.JobStatus.Cancelled)
        );

        assertEq(address(fieldSeal).balance, 0);
        assertGt(job.completedAt, 0);
    }

    function test_RevertWhenStrangerSubmitsEvidence() public {
        uint256 jobId = _createJob();

        bytes32 evidenceHash =
            keccak256(bytes(EVIDENCE_NOTE));

        vm.expectRevert(FieldSeal.Unauthorized.selector);
        vm.prank(stranger);

        fieldSeal.submitEvidence(
            jobId,
            EVIDENCE_NOTE,
            evidenceHash
        );
    }

    function test_RevertWhenWorkerApprovesPayment() public {
        uint256 jobId = _createJob();

        _submitEvidence(jobId);

        vm.expectRevert(FieldSeal.Unauthorized.selector);
        vm.prank(worker);

        fieldSeal.approveAndRelease(jobId);
    }

    function test_RevertWhenApprovingBeforeSubmission() public {
        uint256 jobId = _createJob();

        vm.expectRevert(
            abi.encodeWithSelector(
                FieldSeal.InvalidStatus.selector,
                FieldSeal.JobStatus.Submitted,
                FieldSeal.JobStatus.Funded
            )
        );

        vm.prank(client);
        fieldSeal.approveAndRelease(jobId);
    }

    function test_RevertWhenCancellingSubmittedJob() public {
        uint256 jobId = _createJob();

        _submitEvidence(jobId);

        vm.expectRevert(
            abi.encodeWithSelector(
                FieldSeal.InvalidStatus.selector,
                FieldSeal.JobStatus.Funded,
                FieldSeal.JobStatus.Submitted
            )
        );

        vm.prank(client);
        fieldSeal.cancelJob(jobId);
    }

    function test_RevertWhenCreatingJobWithoutPayment() public {
        vm.expectRevert(FieldSeal.InvalidAmount.selector);
        vm.prank(client);

        fieldSeal.createJob(
            worker,
            JOB_DESCRIPTION
        );
    }

    function test_RevertWhenCreatingJobForSelf() public {
        vm.expectRevert(FieldSeal.SameParticipant.selector);
        vm.prank(client);

        fieldSeal.createJob{value: PAYMENT}(
            client,
            JOB_DESCRIPTION
        );
    }

    function test_RevertWhenDescriptionIsEmpty() public {
        vm.expectRevert(FieldSeal.EmptyDescription.selector);
        vm.prank(client);

        fieldSeal.createJob{value: PAYMENT}(
            worker,
            ""
        );
    }

    function test_RevertWhenEvidenceIsEmpty() public {
        uint256 jobId = _createJob();

        vm.expectRevert(FieldSeal.EmptyEvidence.selector);
        vm.prank(worker);

        fieldSeal.submitEvidence(
            jobId,
            "",
            bytes32(0)
        );
    }

    function _createJob()
        internal
        returns (uint256 jobId)
    {
        vm.prank(client);

        jobId = fieldSeal.createJob{value: PAYMENT}(
            worker,
            JOB_DESCRIPTION
        );
    }

    function _submitEvidence(uint256 jobId) internal {
        bytes32 evidenceHash =
            keccak256(bytes(EVIDENCE_NOTE));

        vm.prank(worker);

        fieldSeal.submitEvidence(
            jobId,
            EVIDENCE_NOTE,
            evidenceHash
        );
    }
}