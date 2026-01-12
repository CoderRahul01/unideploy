# UniDeploy Safety Contract

This document defines the core invariants and safety guarantees that the platform MUST maintain at all times. Any architectural change or feature addition MUST strictly adhere to these rules.

## 1. State Invariants
- **Source of Truth**: Kubernetes is the definitive authority for whether a project is `RUNNING`.
- **Atomic Transitions**: All project status changes MUST use a two-phase commit pattern with database rollback on external failure.
- **Illegal States**: A project status change MUST be validated against the `StateMachine` transition table.

## 2. Resource & Quota Invariants
- **Runtime Ceiling**: No project shall exceed the daily runtime limit (default 60m) without explicitly being granted a policy exception.
- **Concurrency Cap**: Every user is restricted to a maximum of **one** concurrent running project on the free tier.
- **Platform Capacity**: The system MUST reject mutations if the total pod count reaches the platform ceiling (default 40 pods).

## 3. Concurrency Law
- **Per-Project Isolation**: Only one mutation operation (Start/Stop/Deploy) may be active for a single project at any time. This MUST be enforced via row-level locking.

## 4. Maintenance Law
- **Auto-Sleep**: Idle projects (no traffic for 15m) MUST be scaled down to zero replicas.
- **Active Reconciliation**: The platform MUST periodically reconcile database state with actual Kubernetes status.

## 5. Emergency Protocol
- **Panic Switch**: When `UNIDEPLOY_READ_ONLY` is enabled, all state-mutating operations MUST be rejected immediately.

---
*Failure to maintain these invariants constitutes a critical system failure.*
