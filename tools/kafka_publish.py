# Description: Smoke test tool to publish OTLP fixture data to MSK topic via mTLS
# Description: Reads test fixture, wraps in Kafka-compatible format, and sends via boto3 MSK client

import argparse
import json
import os
import sys
from pathlib import Path

import boto3

FIXTURE_PATH = Path(__file__).parent.parent / "tests" / "fixtures" / "otlp" / "otlp_bundle_ok.json"


def load_fixture(fixture_path: str = None) -> dict:
    """Load OTLP fixture JSON from disk."""
    path = Path(fixture_path) if fixture_path else FIXTURE_PATH
    if not path.exists():
        print(f"Fixture not found: {path}")
        sys.exit(1)
    with open(path) as f:
        return json.load(f)


def publish_to_msk(
    bootstrap_servers: str,
    topic: str,
    payload: dict,
    count: int = 1,
    region: str = "us-east-1",
):
    """
    Publish OTLP bundles to MSK topic using the kafka-python library.

    Requires kafka-python: pip install kafka-python
    mTLS certs must be available at paths specified by env vars:
      - MSK_TLS_CERT_FILE: path to client certificate PEM
      - MSK_TLS_KEY_FILE: path to client private key PEM
      - MSK_TLS_CA_FILE: path to CA certificate PEM (optional, defaults to system CA)
    """
    try:
        from kafka import KafkaProducer
    except ImportError:
        print("kafka-python is required: pip install kafka-python")
        sys.exit(1)

    cert_file = os.environ.get("MSK_TLS_CERT_FILE")
    key_file = os.environ.get("MSK_TLS_KEY_FILE")
    ca_file = os.environ.get("MSK_TLS_CA_FILE")

    if not cert_file or not key_file:
        print("MSK_TLS_CERT_FILE and MSK_TLS_KEY_FILE environment variables are required")
        sys.exit(1)

    producer = KafkaProducer(
        bootstrap_servers=bootstrap_servers.split(","),
        security_protocol="SSL",
        ssl_certfile=cert_file,
        ssl_keyfile=key_file,
        ssl_cafile=ca_file,
        value_serializer=lambda v: json.dumps(v).encode("utf-8"),
    )

    for i in range(count):
        future = producer.send(topic, value=payload)
        result = future.get(timeout=30)
        print(f"[{i+1}/{count}] Sent to {topic} partition={result.partition} offset={result.offset}")

    producer.flush()
    producer.close()
    print(f"Published {count} record(s) to {topic}")


def main():
    parser = argparse.ArgumentParser(description="Publish OTLP fixtures to MSK topic for smoke testing")
    parser.add_argument("--bootstrap-servers", required=True, help="MSK bootstrap servers (comma-separated)")
    parser.add_argument("--topic", default="lm.metrics.otlp", help="Kafka topic name")
    parser.add_argument("--fixture", default=None, help="Path to OTLP fixture JSON (default: tests/fixtures/otlp/otlp_bundle_ok.json)")
    parser.add_argument("--count", type=int, default=1, help="Number of messages to publish")
    parser.add_argument("--region", default="us-east-1", help="AWS region")

    args = parser.parse_args()
    payload = load_fixture(args.fixture)

    print(f"Publishing to {args.bootstrap_servers} topic={args.topic}")
    publish_to_msk(
        bootstrap_servers=args.bootstrap_servers,
        topic=args.topic,
        payload=payload,
        count=args.count,
        region=args.region,
    )


if __name__ == "__main__":
    main()
