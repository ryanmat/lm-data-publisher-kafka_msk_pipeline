# TODO — LM Data Publisher → MSK → Pipes → Firehose → S3 (DEFAULT 1→N)

## Status Legend
- [ ] Not started
- [~] In progress
- [x] Done

## EPICS
- [ ] A0 Env pinning & security
- [ ] A1 Repo & CI
- [ ] A2 Flattener library
- [ ] A3 Lambda writer (fan-out)
- [ ] A4 S3/KMS
- [ ] A5 Firehose + partitioning
- [ ] A6 Secrets & mTLS
- [ ] A7 Pipe (MSK→Lambda)
- [ ] A8 Integration & docs

## Stories (snapshot)
- [ ] B0 Prompt 0
- [ ] B1 Bootstrap repo
- [ ] B2 Spec loader & fixtures
- [ ] B3 Flattener (List[dict])
- [ ] B4 Lambda writer
- [ ] B5 CDK app skeleton
- [ ] B6 StorageStack
- [ ] B7 DeliveryStack
- [ ] B8 Dynamic partitioning
- [ ] B9 Network (endpoints+SGs)
- [ ] B10 Secrets inputs
- [ ] B11 Pipe skeleton
- [ ] B12 MSK source bind + filter
- [ ] B13 Pipe target = Lambda
- [ ] B14 Smoke test harness
- [ ] B15 Glue/Athena (opt)
- [ ] B16 Alarms & Budget
- [ ] B17 Docs final

## Optional Branch (1→1 simple enrichment)
- [ ] C14B Simple 1→1 enrichment path
- [ ] C14B.1 Enrichment returns single object
- [ ] C14B.2 Update tests & target = Firehose

## Notes
- Use mTLS; no SASL. Ensure client certs available before MSK binding.
- Kafka payloads are OTLP bundles; default path splits to row events in Lambda writer.