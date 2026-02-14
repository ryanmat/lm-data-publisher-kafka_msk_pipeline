# LogicMonitor Data Publisher → MSK → Pipes → Firehose → Snowflake

Data pipeline that ingests OTLP metrics from LogicMonitor Data Publisher through AWS MSK (Kafka), transforms bundles into row events via Lambda, and delivers them to Snowflake via Firehose. PowerBI connects to Snowflake for reporting.

## Architecture

```
LMDP → MSK (mTLS) → EventBridge Pipe → Lambda (1→N fan-out) → Firehose → Snowflake
                                                                        ↘ S3 (errors only)

PowerBI ← Snowflake (native connector, DirectQuery or Import)
```

### Data Flow

1. LogicMonitor Data Publisher sends OTLP metric bundles to MSK via mTLS
2. EventBridge Pipe consumes from the MSK topic
3. Lambda fan-out: each OTLP bundle is flattened into N individual row events
4. Lambda writes row events to Firehose via `PutRecordBatch`
5. Firehose delivers JSON records to Snowflake (failed records go to S3)
6. PowerBI queries Snowflake directly via native connector

### Snowflake Table

```sql
LM_METRICS.PIPELINE.ROW_EVENTS
  orgId, deviceId, deviceName, datasource, instance, metric,
  unit, type, ts, tsUnixMs, value, attributes, resource, scope
```

Quoted identifiers preserve lowercase to match `flatten.py` JSON output keys. JSON_MAPPING maps keys to matching quoted column names.

## Version Pinning

### Python
- Python: 3.11.14
- uv: 0.9.9
- pytest: 9.0.1
- black: 25.11.0
- ruff: 0.14.5

### Node/TypeScript
- Node.js: 25.2.0
- npm: 11.6.2
- aws-cdk-lib: 2.181.1
- TypeScript: 5.7.3
- Jest: 29.7.0
- cdk-nag: 2.29.52

## Prerequisites

- AWS Account with CloudFormation, S3, IAM, Lambda, Kinesis, Secrets Manager permissions
- AWS CLI configured with credentials
- Snowflake account provisioned via AWS Marketplace (see setup guide below)
- Node.js 25.2.0 or compatible LTS
- Python 3.11.x
- uv package manager installed
- Make (optional, for convenience commands)

## Initial Setup

### 1. Clone and Install

```bash
git clone https://github.com/ryanmat/lm-data-publisher-kafka_msk_pipeline.git
cd lm-data-publisher-kafka_msk_pipeline
make setup
```

### 2. Configure Environment

```bash
cp .env.example .env
# Edit .env with your Snowflake account URL, MSK cluster details, etc.
```

### 3. Snowflake Marketplace Setup

Follow `docs/snowflake-marketplace-setup.md` to:
1. Subscribe to Snowflake via AWS Marketplace
2. Generate RSA key pair for service user auth
3. Create service user in Snowflake
4. Store private key in Secrets Manager

### 4. AWS CDK Bootstrap

```bash
npx cdk bootstrap aws://497495481268/us-east-1
```

### 5. Verify Setup

```bash
make test
```

## Project Structure

```
.
├── infra/                  # AWS CDK TypeScript infrastructure
│   ├── bin/app.ts         # CDK app entry point
│   └── lib/
│       ├── base-stack.ts           # Base infrastructure
│       ├── storage-stack.ts        # S3 error/backup bucket + KMS
│       ├── delivery-stack.ts       # Firehose → Snowflake
│       ├── network-stack.ts        # VPC endpoints + security groups
│       ├── snowflake-auth-stack.ts # Secrets Manager for SF key pair
│       ├── snowflake-setup-stack.ts # Custom Resource for SF DDL
│       ├── auth-stack.ts           # mTLS secrets for MSK
│       ├── pipe-stack.ts           # EventBridge Pipe (MSK → Lambda)
│       └── alarms-stack.ts         # CloudWatch alarms + budget
├── lambda/                 # Python Lambda functions
│   ├── handler.py         # EventBridge Pipes handler (MSK → Firehose)
│   ├── flatten.py         # OTLP bundle → row events (1→N)
│   ├── spec_loader.py     # Schema validation from spec
│   └── snowflake_setup/   # Custom Resource for Snowflake DDL
├── tests/                  # Python unit tests
│   └── fixtures/otlp/    # OTLP test data
├── tools/                  # Utility scripts
├── Makefile               # Convenience commands
├── pyproject.toml         # Python dependencies (uv)
├── package.json           # Node dependencies
├── cdk.json               # CDK configuration
└── tsconfig.json          # TypeScript configuration
```

## CDK Stacks

| Stack | Purpose |
|-------|---------|
| **BaseStack** | Common infrastructure foundation |
| **StorageStack** | S3 error/backup bucket with KMS encryption |
| **SnowflakeAuthStack** | Secrets Manager secret for Snowflake key-pair auth |
| **SnowflakeSetupStack** | Custom Resource Lambda that runs Snowflake DDL |
| **DeliveryStack** | Firehose delivery stream with Snowflake destination |
| **NetworkStack** | VPC endpoints and security groups for MSK access |
| **AuthStack** | mTLS certificate secrets for MSK authentication |
| **PipeStack** | EventBridge Pipe (MSK source → Lambda target) |
| **AlarmsStack** | CloudWatch alarms and budget monitoring |

## Development Workflow

### Running Tests

```bash
make test            # All tests (Python + CDK)
make test-python     # Python tests only
make test-infra      # CDK infrastructure tests only
```

### Code Quality

```bash
make lint            # Run linters
make format          # Auto-format code
```

### CDK Operations

```bash
make synth           # Synthesize CloudFormation templates
make deploy          # Deploy to AWS
make destroy         # Destroy infrastructure
```

## Spec-Driven Fixtures

This project uses schema-driven development from `docs/kafka_ingest_spec.md`. The spec defines the canonical Row Event schema and OTLP bundle mappings.

### Spec Loader

`lambda/spec_loader.py` parses the spec file and extracts:
- Row Event schema definition (fields, types, constraints)
- Required field list for validation
- Test fixtures for contract testing

### Test Fixtures

Test fixtures in `tests/fixtures/otlp/`:
- `otlp_bundle_ok.json` - Sample OTLP bundle from LMDP
- `row_event_ok.json` - Expected flattened row event output
- `row_event_missing_required.json` - Invalid event for negative testing

## Security

### Secret Management
- Snowflake key pair stored in AWS Secrets Manager
- mTLS certificates stored in AWS Secrets Manager
- `.gitignore` excludes `.pem`, `.key`, `.p8`, `.env` files

### CDK Nag
All infrastructure tests include cdk-nag security checks. Builds fail on High severity findings. Suppressions require documented justification in `infra/lib/nag-suppressions.ts`.

### mTLS Authentication
Pipeline uses mTLS (mutual TLS) for Kafka authentication. No SASL or IAM authentication on the data plane. EventBridge Pipes authenticates to MSK using mTLS client certificates.

## AWS Resources

| Resource | Details |
|----------|---------|
| **Region** | us-east-1 |
| **MSK Cluster** | mTLS auth, Kafka 3.8.x |
| **MSK Topic** | `lm.metrics.otlp` (UTF-8 JSON) |
| **Firehose** | DirectPut, Snowflake destination |
| **S3 Bucket** | Error/backup records only, KMS encrypted |
| **Snowflake DB** | `LM_METRICS.PIPELINE.ROW_EVENTS` |
| **Snowflake WH** | `LM_FIREHOSE_WH` (XSMALL, auto-suspend 60s) |

## Key Design Decisions

1. **Snowflake over S3+Athena**: PowerBI users are the primary consumers; Snowflake provides native PowerBI connector with DirectQuery support
2. **1-to-N Fan-out**: Lambda splits OTLP bundles into individual row events for query-friendly table structure
3. **S3 for errors only**: Firehose sends failed records to S3; successful records go directly to Snowflake
4. **JSON_MAPPING**: Firehose maps JSON keys to quoted Snowflake column names, preserving lowercase from `flatten.py`
5. **Test-Driven Development**: Tests written before implementation (pytest + Jest)
6. **Security-First**: mTLS auth, cdk-nag enforcement, Secrets Manager, secret scanning

## Troubleshooting

### CDK Bootstrap Issues
```bash
aws sts get-caller-identity   # Verify credentials
npx cdk bootstrap aws://497495481268/us-east-1
```

### Test Failures
```bash
make clean && make setup && make test
```

### Snowflake Connectivity
```bash
python tools/verify_snowflake.py
```

## License

Internal project - see organization policies.
