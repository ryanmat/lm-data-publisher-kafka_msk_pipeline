# LogicMonitor Data Publisher to MSK to Pipes to Firehose to S3

Data pipeline that ingests OTLP metrics from LogicMonitor Data Publisher through AWS MSK (Kafka), transforms bundles into row events via Lambda, and lands them partitioned in S3 via Firehose.

## Architecture

```
LMDP -> MSK (mTLS) -> EventBridge Pipe -> Lambda (1->N fan-out) -> Firehose -> S3
                                                                                |
                                                                                v
                                                                          Glue/Athena
```

## Version Pinning

This project uses exact versions for reproducibility.

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

- AWS Account with CloudFormation, S3, IAM, Lambda, Kinesis permissions
- AWS CLI configured with credentials
- Node.js 25.2.0 or compatible LTS
- Python 3.11.x
- uv package manager installed
- Make (optional, for convenience commands)

## Initial Setup

### 1. Clone and Navigate

```bash
cd cloud/aws/kafka_msk_pipeline
```

### 2. Install Dependencies

```bash
# Using Make (recommended)
make setup

# Or manually:
uv sync --locked    # Python dependencies
npm install         # Node dependencies
```

### 3. Install Pre-commit Hooks (Optional but Recommended)

Pre-commit hooks run black, ruff, eslint, and prettier automatically before each commit.

```bash
# Install pre-commit
pip install pre-commit

# Install the git hooks
pre-commit install

# Test the hooks (optional)
pre-commit run --all-files
```

Hooks will now run automatically on `git commit`. To bypass hooks temporarily (not recommended):
```bash
git commit --no-verify
```

### 4. AWS CDK Bootstrap

Before synthesizing or deploying, bootstrap your AWS environment for CDK. This creates the S3 bucket, ECR repository, and IAM roles required for CDK deployments.

```bash
# Bootstrap for your account and region
npx cdk bootstrap aws://ACCOUNT-ID/REGION

# Example for us-west-2
npx cdk bootstrap aws://497495481268/us-west-2
```

Bootstrap is required once per account/region combination.

### 5. Verify Setup

```bash
# Run all tests
make test

# Or individually:
uv run pytest -q    # Python tests
npm test            # CDK infrastructure tests
```

## Project Structure

```
.
├── docs/               # Documentation and specifications
│   ├── plan.md        # Implementation plan with 17 prompts
│   ├── todo.md        # Progress tracking
│   └── kafka_ingest_spec.md  # OTLP to Row Event mapping spec
├── infra/             # AWS CDK TypeScript infrastructure
│   ├── bin/           # CDK app entry point
│   └── lib/           # Stack definitions and constructs
├── lambda/            # Python Lambda functions
├── tests/             # Python unit tests
├── tools/             # Utility scripts (Kafka publish, S3 verify)
├── .github/           # CI/CD workflows
├── Makefile           # Convenience commands
├── pyproject.toml     # Python dependencies (uv)
├── package.json       # Node dependencies
├── cdk.json           # CDK configuration
└── tsconfig.json      # TypeScript configuration
```

## Development Workflow

### Running Tests

```bash
# All tests (Python + CDK)
make test

# Python tests only
make test-python

# CDK infrastructure tests only
make test-infra
```

### Code Quality

```bash
# Run linters
make lint

# Auto-format code
make format
```

### CDK Operations

```bash
# Synthesize CloudFormation templates
make synth
# Or: npm run synth

# Deploy to AWS
make deploy
# Or: npm run deploy

# Destroy infrastructure
make destroy
# Or: npx cdk destroy --all
```

## Spec-Driven Fixtures

This project uses schema-driven development from `docs/kafka_ingest_spec.md`. The spec defines the canonical Row Event schema and OTLP bundle mappings.

### Spec Loader

`lambda/spec_loader.py` parses the spec file and extracts:
- Row Event schema definition (fields, types, constraints)
- Required field list for validation
- Test fixtures for contract testing

Example usage:

```python
from spec_loader import SpecLoader

loader = SpecLoader()
required_fields = loader.get_required_fields()
field_types = loader.get_field_types()

# Validate a row event
is_valid = loader.validate_row_event(row_event)
```

### Test Fixtures

Test fixtures are stored in `tests/fixtures/otlp/`:
- `otlp_bundle_ok.json` - Sample OTLP bundle from LMDP
- `row_event_ok.json` - Expected flattened row event output
- `row_event_missing_required.json` - Invalid event for negative testing

These fixtures ensure the transformation logic matches the spec exactly.

## Security

### Secret Detection

Gitleaks runs in CI to block commits containing secrets. Do not commit `.pem`, `.key`, `.crt`, credentials, or `.env` files. mTLS certificates are stored in AWS Secrets Manager.

### CDK Nag

All infrastructure tests include cdk-nag security checks. Builds fail on High severity findings. Suppressions require documented justification in `infra/lib/nag-suppressions.ts`.

### mTLS Authentication

Pipeline uses mTLS (mutual TLS) for Kafka authentication. No SASL or IAM authentication on the data plane. Client certificates provisioned via ACM Private CA and stored in AWS Secrets Manager. EventBridge Pipes authenticates to MSK using mTLS.

## CI/CD

GitHub Actions workflow (`.github/workflows/ci.yml`) runs on every push:

1. Security Scan: Gitleaks checks for exposed secrets
2. Python Tests: pytest + black + ruff
3. Infrastructure Tests: Jest + ESLint + CDK Nag
4. CDK Synth: Validates CloudFormation templates

## AWS Resources

### MSK Cluster
- Name: lm-datapublisher-demo
- Kafka Version: 3.8.x
- Type: Provisioned
- Region: us-west-2

### S3 Bucket
- Name: lm-datapublisher-metrics
- Partitioning: `orgId/metric/YYYY/MM/DD/HH/`
- Encryption: KMS CMK
- Lifecycle: Configured for cost optimization

### Topics
- Topic: `lm.metrics.otlp`
- Format: UTF-8 JSON
- Encoding: `kafka.send.data.in.String=true`

## Implementation Progress

This project follows a 17-prompt iterative plan detailed in `docs/plan.md`.

Current Status: Prompt 0 Complete
- Environment pinning and reproducibility
- CDK bootstrap support
- Security gates (cdk-nag, gitleaks)
- Test-first development setup

Next Steps: See `docs/todo.md` for detailed progress tracking.

## Key Design Decisions

1. 1-to-N Fan-out: Lambda target splits OTLP bundles into row events for query-friendly S3 layout
2. Dynamic Partitioning: Firehose uses JQ to partition by `orgId`, `metric`, and date
3. Test-Driven Development: Tests written before implementation (pytest + Jest)
4. Security-First: mTLS authentication, cdk-nag enforcement, secret scanning

## Troubleshooting

### CDK Bootstrap Issues

```bash
# If bootstrap fails, check your AWS credentials
aws sts get-caller-identity

# Ensure you have required permissions
# - cloudformation:*
# - s3:*
# - iam:CreateRole, iam:AttachRolePolicy, etc.
```

### Test Failures

```bash
# Clean and reinstall
make clean
make setup
make test
```

### Node Version Mismatch

```bash
# Use exact Node version
nvm install 25.2.0
nvm use 25.2.0
```

## Cost Controls

- S3 lifecycle policies for Intelligent-Tiering/Glacier
- CloudWatch log retention: 14-30 days
- Optional metrics disabled by default
- Budget alarms configured (Prompt 16)

## Documentation

- Implementation Plan: `docs/plan.md` - 17 detailed prompts
- OTLP Spec: `docs/kafka_ingest_spec.md` - Canonical row event schema
- Progress: `docs/todo.md` - Task tracking
- Python Standards: `docs/python.md`
- Source Control: `docs/source-control.md`
- uv Guide: `docs/using-uv.md`

## Troubleshooting Checklist

1. Check `docs/plan.md` for implementation guidance
2. Review test failures with `make test`
3. Verify AWS credentials and permissions with `aws sts get-caller-identity`

## License

Internal project - see organization policies.
