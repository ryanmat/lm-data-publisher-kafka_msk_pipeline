# ABOUTME: Lambda handler for EventBridge Pipes (Kafka source) to Firehose fan-out
# ABOUTME: Processes OTLP bundles from Kafka, flattens to row events, and batches to Firehose

import os
import json
import base64
import time
from typing import Dict, List, Any, Optional
import boto3

from flatten import flatten_otlp
from spec_loader import SpecLoader


# Load spec once at module level for reuse across invocations
SPEC_LOADER = SpecLoader()
SPEC = SPEC_LOADER.get_row_event_schema()

# Firehose client (lazy initialization)
_firehose_client = None


def get_firehose_client():
    """Get or create Firehose client."""
    global _firehose_client
    if _firehose_client is None:
        _firehose_client = boto3.client("firehose")
    return _firehose_client


def handler(event: Dict[str, Any], context: Any) -> Dict[str, Any]:
    """
    Lambda handler for EventBridge Pipes with Kafka (MSK) source.

    Processes OTLP bundles from Kafka, flattens to row events, and writes to Firehose.

    Args:
        event: EventBridge Pipes event with Kafka records
        context: Lambda context object

    Returns:
        Response dict with statusCode and summary counts
    """
    # Get configuration from environment
    firehose_stream = os.environ.get("FIREHOSE_STREAM_NAME", "lm-datapublisher-delivery")
    batch_size = int(os.environ.get("BATCH_SIZE", "500"))

    # Process Kafka records
    kafka_records = process_kafka_records(event)
    total_kafka_records = len(kafka_records)

    # Flatten OTLP bundles to row events
    all_rows = []
    for otlp_bundle in kafka_records:
        rows = flatten_otlp(otlp_bundle, SPEC)
        all_rows.extend(rows)

    total_row_events = len(all_rows)

    # Write to Firehose
    if all_rows:
        firehose_result = batch_to_firehose(
            all_rows,
            firehose_stream,
            batch_size=batch_size
        )
    else:
        firehose_result = {
            "total_records": 0,
            "failed_records": 0,
            "batches": 0
        }

    # Build response
    return {
        "statusCode": 200,
        "body": {
            "total_kafka_records": total_kafka_records,
            "total_row_events": total_row_events,
            "total_firehose_records": firehose_result["total_records"],
            "failed_records": firehose_result["failed_records"],
            "batches": firehose_result["batches"]
        }
    }


def process_kafka_records(event: Dict[str, Any]) -> List[Dict[str, Any]]:
    """
    Extract and decode Kafka records from EventBridge Pipes event.

    Args:
        event: EventBridge Pipes event with Kafka source

    Returns:
        List of decoded OTLP bundle dictionaries
    """
    records = []

    # EventBridge Pipes with Kafka source structure:
    # event["records"]["topic-partition"] = [{"value": "base64-encoded-json"}]
    kafka_records = event.get("records", {})

    for topic_partition, partition_records in kafka_records.items():
        for record in partition_records:
            # Decode base64 value
            value_b64 = record.get("value", "")
            if value_b64:
                value_bytes = base64.b64decode(value_b64)
                value_str = value_bytes.decode("utf-8")
                otlp_bundle = json.loads(value_str)
                records.append(otlp_bundle)

    return records


def batch_to_firehose(
    rows: List[Dict[str, Any]],
    stream_name: str,
    batch_size: int = 500,
    max_retries: int = 3,
    firehose_client=None
) -> Dict[str, Any]:
    """
    Write row events to Firehose in batches with retry logic.

    Args:
        rows: List of row event dictionaries
        stream_name: Firehose delivery stream name
        batch_size: Maximum records per batch (default 500, AWS limit)
        max_retries: Maximum retry attempts for failed records

    Returns:
        Summary dict with total_records, failed_records, batches
    """
    total_records = len(rows)
    total_failed = 0
    batch_count = 0

    # Get Firehose client
    if firehose_client is None:
        firehose_client = get_firehose_client()

    # Split into batches
    batches = [rows[i:i + batch_size] for i in range(0, len(rows), batch_size)]

    for batch in batches:
        batch_count += 1
        failed_records = _put_batch_with_retry(
            batch,
            stream_name,
            max_retries,
            firehose_client
        )
        total_failed += len(failed_records)

    return {
        "total_records": total_records,
        "failed_records": total_failed,
        "batches": batch_count
    }


def _put_batch_with_retry(
    rows: List[Dict[str, Any]],
    stream_name: str,
    max_retries: int,
    firehose_client
) -> List[Dict[str, Any]]:
    """
    Put a batch to Firehose with exponential backoff retry for failed records.

    Args:
        rows: Batch of row events
        stream_name: Firehose delivery stream name
        max_retries: Maximum retry attempts

    Returns:
        List of rows that failed after all retries
    """
    records_to_send = rows
    retry_count = 0

    while records_to_send and retry_count <= max_retries:
        # Format records for Firehose
        firehose_records = [
            {"Data": (json.dumps(row) + "\n").encode("utf-8")}
            for row in records_to_send
        ]

        # Send to Firehose
        response = firehose_client.put_record_batch(
            DeliveryStreamName=stream_name,
            Records=firehose_records
        )

        # Check for failures
        failed_count = response.get("FailedPutCount", 0)

        if failed_count == 0:
            # All succeeded
            return []

        # Collect failed records for retry
        failed_records = []
        response_list = response.get("RequestResponses", [])

        for i, resp in enumerate(response_list):
            if "ErrorCode" in resp:
                # This record failed
                failed_records.append(records_to_send[i])

        # Prepare for retry
        records_to_send = failed_records
        retry_count += 1

        if records_to_send and retry_count <= max_retries:
            # Exponential backoff
            time.sleep(2 ** retry_count * 0.1)

    # Return records that failed after all retries
    return records_to_send
