# LogicMonitor Data Publisher → MSK → EventBridge Pipes → Firehose → S3
**Project Blueprint, Iterative Plan, and Code‑Gen Prompts (Definitive)**

> Constraint recap: LMDP supports SSL/TLS only (no SASL). MSK uses **mTLS** for producer (LMDP) and consumer.  
> **DEFAULT pipeline:** EventBridge Pipe (MSK source) → **Lambda target (fan‑out 1→N)** → Firehose → S3.  
> Optional simple path: enrichment 1→1 → Firehose (no fan‑out).

---

## 1. Goals & Non‑Goals

### Goals
- Ingest OTLP metrics bundles from LMDP → MSK, **fan‑out to row events**, and land partitioned objects in S3.
- Provide repeatable **IaC (AWS CDK, TypeScript)** and **Lambda code (Python 3.11, uv)** with unit/integration tests.
- Secure auth with **mTLS**; avoid SASL/IAM for data plane.
- Operational runbook + cost controls.

### Non‑Goals
- Installing/managing LogicMonitor Collectors.
- Full analytics layer (we expose Glue/Athena hooks).

### Inputs
- `kafka_ingest_spec.md` (now provided) — canonical Row Event and OTLP bundle mapping.
- Existing MSK cluster, ACM PCA, client certs for producer and Pipe.

---

## 2. Target Architecture (summary — DEFAULT = 1→N via Lambda target)
- **Producer:** LMDP → MSK topic `lm.metrics.otlp` (mTLS).
- **Pipe:** EventBridge Pipe (source=MSK, mTLS) → **Lambda target (fan‑out OTLP bundle → N Row Events)** → **Amazon Data Firehose** → **S3**.
- **Alternate simple path:** Pipe enrichment (1→1) → Firehose.
- **Catalog:** Glue Crawler → Athena (optional).
- **Observability:** CloudWatch metrics/logs + SQS DLQ for Pipe; broker logs → CloudWatch.

---

## 3. Key Design Choices
- **Default 1→N**: Because LMDP emits a **single JSON bundle per poll** (avg ~25 KB), we split per‑datapoint in the **Lambda target** so each Firehose record is a **single row** (best for partitioning and queries).
- **UTF‑8 JSON** payloads (`kafka.send.data.in.String=true`) to enable simple ingestion and limited Pipe filtering.
- **Firehose dynamic partitioning** (JQ) by `orgId`, `metric`, `dt` for query‑friendly S3 layout.
- **CDK stacks**: `Base`, `Storage`, `Delivery`, `Transform` (Lambda writer), `Network`, `Auth`, `Pipe`.

---

## 4. Risks & Mitigations
- **Deeply nested OTLP:** We keep mapping logic in a pure function (`flatten_otlp`) with fixtures/tests from the spec.
- **Throughput spikes:** Firehose batching + retry; PutRecordBatch in Lambda with partial failure handling.
- **Cost:** S3 lifecycle, constrained log retention, optional metrics.

---

## 5. Iterative Plan (epics → stories → micro‑steps)

### Epics (A)
A0. Env pinning & security gates (uv, cdk‑nag, gitleaks).  
A1. Repo & CI.  
A2. Flattener library + tests.  
A3. Lambda writer (fan‑out) + tests.  
A4. IaC foundations (S3/KMS).  
A5. Firehose delivery (dynamic partitioning).  
A6. Secrets & mTLS (Pipe).  
A7. EventBridge Pipe (MSK source → Lambda target).  
A8. Integration harness & docs (Glue/Athena optional).

### Stories (B)
B0. **Prompt 0** env & security.  
B1. Repo bootstrap.  
B2. OTLP fixtures & spec loader.  
B3. Flattener pure function (→ List[dict]).  
B4. Lambda writer (fan‑out to Firehose).  
B5. CDK app skeleton + tests.  
B6. StorageStack (S3+KMS) + tests.  
B7. DeliveryStack (Firehose) + tests.  
B8. Secrets inputs (mTLS) + tests.  
B9. Network (endpoints+SGs) + tests.  
B10. Pipe skeleton (role, DLQ, logs).  
B11. MSK source bind (mTLS) + coarse filters.  
B12. Wire Pipe target = Lambda writer (default).  
B13. Smoke test (fixtures → S3).  
B14. Glue/Athena optional.  
B15. Alarms & budget.  
B16. Docs & teardown.

### Micro‑steps (C) — each ≤1–2h, ends “wired”
C0. Toolchains pinned; `cdk bootstrap`; cdk‑nag & gitleaks in CI.  
C1. Repo tree + README + plan/todo.  
C2. Spec loader skeleton + fixtures.  
C3. Implement `flatten_otlp()` → List[dict] + tests.  
C4. Lambda writer handler: batching, retries, metrics + tests.  
C5. CDK app + synth test.  
C6. S3/KMS stack + Jest assertions.  
C7. Firehose stream + compression/buffers + tests.  
C8. Dynamic partitioning (JQ) + tests.  
C9. Pipes VPC endpoint (flag) & SG rules + tests.  
C10. Secrets Manager inputs + validation + tests.  
C11. Pipe IAM/DLQ/logs + tests.  
C12. Pipe MSK source (mTLS) + **coarse filters** (resource-level only) + tests.  
C13. Pipe target = Lambda writer + IAM + tests.  
C14. E2E smoke (fixtures → S3) + docs.  
C15. Optional Glue/Athena + sample query.  
C16. Alarms & budgets.  
C17. Final docs and teardown.

---

## 6. Test Strategy
- **Unit**: Python (pytest) for `flatten_otlp()`; handler fan‑out + partial failure retry.  
- **IaC tests**: Jest + @aws-cdk/assertions; **cdk‑nag** gate (no High).  
- **Contract**: Fixtures from `kafka_ingest_spec.md` validate mapping.  
- **Integration smoke**: Publish fixtures to MSK; verify S3 prefixes/objects; optional Athena query.

---

## 7. Code‑Generation LLM Prompts (Definitive, Step‑by‑Step)

> Follow in order. Each prompt is stand‑alone, test‑first, and ends with integrated, wired code. We use **uv** for Python and pin versions. EventBridge Pipes uses **L1** `aws_cdk.aws_pipes.CfnPipe`.

### Prompt 0 — Environment pinning, CDK bootstrap, and security checks (uv‑first)
```text
Goal: Prepare reproducible environment and security gates.

Tasks:
1) Pin versions (document in README):
   - Node LTS (exact), aws-cdk-lib v2.x (exact), Python 3.11.x.
2) Adopt uv:
   - `uv init` to create pyproject.toml; `uv add pytest black ruff` for dev; commit lock file.
   - CI uses: `uv sync --locked` and `uv run pytest -q`.
3) Makefile/Taskfile with: setup, lint, test, synth, deploy, destroy (use uv & npm).
4) Add cdk-nag in /infra tests; fail on High findings (allow a suppressions file).
5) Add gitleaks (or truffleHog) in CI to block secrets; add .gitignore for certs/keys and build outputs.
6) Add “CDK bootstrap” step in README and require it before synth/deploy.

Acceptance:
- `npm test` and `uv run pytest -q` run.
- `cdk synth` works after `cdk bootstrap`.
- cdk-nag and gitleaks run in CI.
```
### Prompt 1 — Repository scaffold & quality gates
```text
You are generating a repo skeleton for the “LM Data Publisher → MSK → Pipes → Firehose → S3” project.

Tasks:
1) Create folders: /infra (AWS CDK TypeScript), /lambda (Python 3.11), /tests, /docs.
2) Add README.md summarizing the goal and a Mermaid diagram placeholder.
3) Add plan.md, todo.md, and link to kafka_ingest_spec.md.
4) Tooling:
   - Python: pyproject.toml (uv), black, ruff, pytest.
   - TypeScript: package.json with aws-cdk-lib, constructs, typescript, jest, ts-jest, @aws-cdk/assertions, eslint, prettier.
   - Pre-commit config to run black/ruff (Python) and eslint/prettier (TS).
5) CI: GitHub Actions workflow that runs `uv run pytest -q` and `npm test` on PRs.

Acceptance:
- `uv run pytest -q` runs (0 tests OK).
- `npm test` runs (Jest initialized).
- Pre-commit hooks installation documented in README.
```
### Prompt 2 — OTLP fixtures & spec loader
```text
Goal: Introduce schema-driven development from kafka_ingest_spec.md.

Tasks:
1) In /lambda, add `spec_loader.py` that reads kafka_ingest_spec.md (YAML/JSON fenced blocks)
   and returns a dict of fields to extract (metricName, value, timestamp, attributes).
2) Under /tests/fixtures/otlp/, add sample OTLP JSON payloads (raw) and expected flattened JSON lines.
3) Add pytest `test_spec_loader.py` asserting loader returns required keys and validates sample payloads.

Acceptance:
- `uv run pytest -q` shows tests for spec_loader passing.
- README updated with “Spec-driven fixtures” section.
```
### Prompt 3 — Implement pure flattener (1→N)
```text
Goal: Implement `flatten_otlp()` as a pure function with no AWS dependencies.

Tasks:
1) Create /lambda/flatten.py with `flatten_otlp(otlp: dict, spec: dict) -> List[dict]`.
2) Walk resourceMetrics → scopeMetrics → metrics → dataPoints and produce rows:
   { ts, metric, value, attributes:{...}, resource:{...}, scope:{...}, orgId?, deviceId?, datasource?, instance? }.
3) Add pytest `test_flatten.py` with property tests (timestamps) and fixture-based exact matches (N rows).

Acceptance:
- `uv run pytest -q` all green; coverage for flatten.py ≥ 85%.
```
### Prompt 4 — Lambda writer (Pipe target) — fan‑out to Firehose
```text
Goal: Deployable target Lambda that fans out a Kafka OTLP bundle into N row events and writes to Firehose.

Tasks:
1) Create /lambda/handler.py with `handler(event, context)` to accept EventBridge Pipes batch (Kafka source).
2) For each record: decode UTF-8 JSON `value`, call `flatten_otlp()` → rows, batch into Firehose `PutRecordBatch`.
3) Handle partial failures with retries; return summary counts. Env: FIREHOSE_STREAM_NAME, BATCH_SIZE (<=500), ORG_KEY, METRIC_KEY, SCHEMA_VERSION.
4) Add pytest `test_handler_contract.py` to assert batching, retries, and output counts using fixtures.

Acceptance:
- Unit tests for flattener and writer green.
```
### Prompt 5 — CDK app skeleton (with L1 CfnPipe available)
```text
Goal: Initialize CDK app and baseline stacks with tests.

Tasks:
1) In /infra, add `bin/app.ts` and `lib/base.ts` with an empty `BaseStack` and tagging.
2) Configure Jest with @aws-cdk/assertions and add a smoke test that `cdk synth` works.
3) Add dependencies for CfnPipe usage (`aws_cdk.aws_pipes.CfnPipe`).

Acceptance:
- `npm run build` and `npm test` pass; a synthesized template is produced.
```
### Prompt 6 — StorageStack: S3 + KMS + lifecycle
```text
Goal: S3 bucket for data lake with encryption and lifecycle.

Tasks:
1) Add `StorageStack` creating an S3 bucket (encryption with CMK), lifecycle policy, and outputs.
2) Export bucket name and KMS key ARN; enforce block public access; unique bucket name (hash suffix).
3) Add Jest tests asserting encryption, lifecycle, and bucket policy conditions.

Acceptance:
- `npm test` green; stack synthesizes.
```
### Prompt 7 — DeliveryStack: Firehose → S3
```text
Goal: Deliver to S3 via Firehose (target for the Lambda writer).

Tasks:
1) Add Firehose delivery stream targeting the S3 bucket with gzip and 1–5 min / 5–32 MB buffering.
2) Grant Firehose write to the bucket and KMS.
3) Add Jest assertions for destination, compression, buffering, and IAM grants.

Acceptance:
- `npm test` green.
```
### Prompt 8 — Dynamic partitioning
```text
Goal: Enable Firehose dynamic partitioning.

Tasks:
1) Turn on dynamic partitioning using JQ: orgId from attributes/top-level, metric, dt from tsUnixMs.
2) Add unit tests to confirm writer rows include fields used by JQ.
3) Add CDK assertions verifying dynamic partitioning configuration.

Acceptance:
- Jest and `uv run pytest -q` both green.
```
### Prompt 9 — NetworkStack: endpoints & security groups (feature-flagged)
```text
Goal: Private connectivity for Pipes.

Tasks:
1) Add `NetworkStack` with VPC interface endpoint for `com.amazonaws.<region>.pipes-data` behind FEATURE_PRIVATE_PIPE.
2) Security Groups: allow 9094 from Pipe SG to MSK SG (param), allow 443 egress from Pipe SG.
3) CDK assertions confirm conditional creation and SG rules.

Acceptance:
- `npm test` green.
```
### Prompt 10 — AuthStack: Secrets Manager inputs (mTLS)
```text
Goal: Provide mTLS cert/key to Pipes.

Tasks:
1) Define params/lookups for a Secrets Manager secret containing CLIENT_CERTIFICATE_TLS_AUTH JSON:
   keys `certificate`, `privateKey`, optional `privateKeyPassword`.
2) At synth time, validate the secret shape (custom aspect) and output its ARN.

Acceptance:
- Jest tests verify parameter wiring and validation behavior.
```
### Prompt 11 — PipeStack skeleton (role, DLQ, logs)
```text
Goal: EventBridge Pipe scaffold and observability.

Tasks:
1) Create Pipe IAM role (least-priv) to invoke Lambda target; (IAM read to MSK is not used when mTLS is provided).
2) Create SQS DLQ and a log group for the Pipe.
3) CDK assertions checking resources and IAM statements.

Acceptance:
- `npm test` green.
```
### Prompt 12 — MSK source binding (mTLS) + coarse filter
```text
Goal: Read from MSK using mTLS and (optional) coarse filters.

Tasks:
1) Configure Pipe source via `aws_cdk.aws_pipes.CfnPipe`: MSK cluster ARN, topic, `TRIM_HORIZON`, mTLS secret reference.
2) Add a JSON filter only on resource-level fields (e.g., `resource.hostId`, `resource.hostName`). Avoid array/deep filters.
3) Jest assertions verify source configuration and filter pattern.

Acceptance:
- `npm test` green.
```
### Prompt 13 — Wire Pipe target = Lambda writer (DEFAULT)
```text
Goal: End-to-end Pipe path with Lambda fan‑out.

Tasks:
1) Set Pipe target to the Lambda writer; ensure role allows `lambda:InvokeFunction`.
2) Ensure Lambda writer has `firehose:PutRecordBatch` permission.
3) Tests: synthetic OTLP bundle → N Firehose records.

Acceptance:
- Jest tests green; `uv run pytest -q` green.
```
### Prompt 14 — E2E smoke test harness (manual-run utility)
```text
Goal: Provide a small tool to publish sample messages and verify S3 outputs.

Tasks:
1) In /tools, create `kafka_publish.py` (mTLS) to send fixtures to MSK (topic from env).
2) Add `verify_s3.py` to check object count and partition prefixes.
3) Document usage in README; no CI run (manual only).

Acceptance:
- Scripts run locally (documented), not required in CI.
```
### Prompt 15 — Glue/Athena (optional)
```text
Goal: Add data catalog & sample query.

Tasks:
1) Add Glue Crawler and database/table targeting the S3 prefix.
2) Provide a sample Athena query file and doc how to run it.

Acceptance:
- CDK tests for crawler; docs updated.
```
### Prompt 16 — Alarms & budgets
```text
Goal: Add operational safety nets.

Tasks:
1) CloudWatch Alarms for Pipe `FailedInvocations`, DLQ depth, Firehose DeliveryToS3Failures.
2) Optional AWS Budgets alert with monthly ceiling.
3) CDK assertions verify alarms exist and target the right metrics.

Acceptance:
- `npm test` green.
```
### Prompt 17 — Final wiring & docs
```text
Goal: Ensure nothing is orphaned and the project is shippable.

Tasks:
1) Cross-stack outputs/params connected (bucket name to Firehose, Lambda ARN to Pipe, secret ARN to Pipe).
2) README final pass: end-to-end deploy steps, smoke test, teardown.
3) Update todo.md state as you progress.

Acceptance:
- Repo builds cleanly; synth passes; unit tests pass; documentation is complete.
```

### Prompt 14B — (Optional) Simple path: enrichment 1→1 → Firehose
```text
Goal: Provide a simpler demo where enrichment is 1→1 and Pipe target is Firehose.

Tasks:
1) Switch Pipe target to Firehose (FEATURE_SIMPLE_ONE_TO_ONE=true) and enable enrichment Lambda (returns one object).
2) Adjust tests accordingly (no fan-out).

Acceptance:
- Jest & `uv run pytest -q` green.
```

---

## 8. Operational Runbook (summary)
- Rotate mTLS certs via Secrets Manager; restart Pipe.
- Tune Firehose buffers/partitioning by query needs.
- Inspect DLQ for failures; log retention set to 14–30 days.

---

## 9. Cost Controls
- S3 lifecycle (IA/Glacier), minimal log retention.
- Keep demo cluster small; optional metrics off by default.