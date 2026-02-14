# ABOUTME: Tests for Lambda handler contract
# ABOUTME: Validates EventBridge Pipes event processing, Firehose batching, and error handling

import json
import sys
import base64
from pathlib import Path
from unittest.mock import Mock, patch, MagicMock
import pytest

# Add lambda directory to path for imports
sys.path.insert(0, str(Path(__file__).parent.parent / "lambda"))
from handler import handler, process_kafka_records, batch_to_firehose


@pytest.fixture
def fixtures_path():
    """Fixture providing path to test fixtures."""
    return Path(__file__).parent / "fixtures" / "otlp"


@pytest.fixture
def otlp_bundle(fixtures_path):
    """Fixture providing a valid OTLP bundle."""
    with open(fixtures_path / "otlp_bundle_ok.json") as f:
        return json.load(f)


@pytest.fixture
def kafka_event(otlp_bundle):
    """Fixture providing an EventBridge Pipes event with Kafka source."""
    # Encode OTLP bundle as base64 (Kafka value)
    value_bytes = json.dumps(otlp_bundle).encode("utf-8")
    value_b64 = base64.b64encode(value_bytes).decode("utf-8")

    return {
        "eventSource": "aws:kafka",
        "eventSourceArn": "arn:aws:kafka:us-west-2:123456789012:cluster/lm-datapublisher-demo/abc",
        "records": {
            "lm.metrics.otlp-0": [
                {
                    "topic": "lm.metrics.otlp",
                    "partition": 0,
                    "offset": 123,
                    "timestamp": 1768646400000,
                    "timestampType": "CREATE_TIME",
                    "key": "acme/i-abc/cpu.utilization/1768646400000",
                    "value": value_b64,
                    "headers": []
                }
            ]
        }
    }


@pytest.fixture
def lambda_context():
    """Fixture providing a mock Lambda context."""
    context = Mock()
    context.function_name = "lm-datapublisher-writer"
    context.memory_limit_in_mb = 512
    context.invoked_function_arn = "arn:aws:lambda:us-west-2:123456789012:function:lm-datapublisher-writer"
    context.aws_request_id = "test-request-id"
    return context


@pytest.fixture
def env_vars(monkeypatch):
    """Fixture setting environment variables."""
    monkeypatch.setenv("FIREHOSE_STREAM_NAME", "lm-datapublisher-delivery")
    monkeypatch.setenv("BATCH_SIZE", "500")
    monkeypatch.setenv("ORG_KEY", "orgId")
    monkeypatch.setenv("METRIC_KEY", "metric")
    monkeypatch.setenv("SCHEMA_VERSION", "1.0")


def test_process_kafka_records_decodes_utf8_json(kafka_event):
    """Test that Kafka record values are decoded from base64 and parsed as JSON."""
    records = process_kafka_records(kafka_event)

    assert len(records) > 0
    record = records[0]
    assert "resourceMetrics" in record
    assert isinstance(record, dict)


def test_process_kafka_records_handles_multiple_partitions(otlp_bundle):
    """Test that records from multiple partitions are processed."""
    value_b64 = base64.b64encode(json.dumps(otlp_bundle).encode("utf-8")).decode("utf-8")

    event = {
        "eventSource": "aws:kafka",
        "records": {
            "topic-0": [{"value": value_b64}],
            "topic-1": [{"value": value_b64}],
        }
    }

    records = process_kafka_records(event)
    assert len(records) == 2


def test_batch_to_firehose_respects_max_batch_size():
    """Test that batching respects max size of 500 records."""
    # Create 600 row events
    rows = [{"metric": f"test.{i}", "value": i} for i in range(600)]

    mock_firehose = MagicMock()
    mock_firehose.put_record_batch.return_value = {"FailedPutCount": 0}

    batch_to_firehose(rows, "test-stream", batch_size=500, firehose_client=mock_firehose)

    # Should make 2 calls: 500 + 100
    assert mock_firehose.put_record_batch.call_count == 2

    # First call should have 500 records
    first_call_args = mock_firehose.put_record_batch.call_args_list[0]
    assert len(first_call_args[1]["Records"]) == 500

    # Second call should have 100 records
    second_call_args = mock_firehose.put_record_batch.call_args_list[1]
    assert len(second_call_args[1]["Records"]) == 100


def test_batch_to_firehose_formats_records_as_json_newline():
    """Test that records are formatted as JSON with newlines."""
    rows = [{"metric": "test", "value": 1}]

    mock_firehose = MagicMock()
    mock_firehose.put_record_batch.return_value = {"FailedPutCount": 0}

    batch_to_firehose(rows, "test-stream", firehose_client=mock_firehose)

    call_args = mock_firehose.put_record_batch.call_args
    record_data = call_args[1]["Records"][0]["Data"]

    # Should be JSON + newline
    assert record_data.endswith(b"\n")
    parsed = json.loads(record_data.decode("utf-8").strip())
    assert parsed["metric"] == "test"


def test_batch_to_firehose_handles_partial_failures():
    """Test that partial failures are retried."""
    rows = [{"metric": f"test.{i}", "value": i} for i in range(10)]

    mock_firehose = MagicMock()

    # First call: 5 failures
    # Second call: all succeed
    mock_firehose.put_record_batch.side_effect = [
        {
            "FailedPutCount": 5,
            "RequestResponses": [
                {"RecordId": "1"} if i < 5 else {"ErrorCode": "ServiceUnavailable"}
                for i in range(10)
            ]
        },
        {"FailedPutCount": 0}
    ]

    result = batch_to_firehose(rows, "test-stream", firehose_client=mock_firehose)

    # Should have made 2 calls (initial + retry)
    assert mock_firehose.put_record_batch.call_count == 2

    # Result should indicate success
    assert result["total_records"] == 10
    assert result["failed_records"] == 0


def test_batch_to_firehose_limits_retries():
    """Test that retries are limited to prevent infinite loops."""
    rows = [{"metric": "test", "value": 1}]

    mock_firehose = MagicMock()

    # Always fail
    mock_firehose.put_record_batch.return_value = {
        "FailedPutCount": 1,
        "RequestResponses": [{"ErrorCode": "ServiceUnavailable"}]
    }

    result = batch_to_firehose(rows, "test-stream", max_retries=3, firehose_client=mock_firehose)

    # Should stop after max_retries
    assert mock_firehose.put_record_batch.call_count == 4  # initial + 3 retries
    assert result["failed_records"] > 0


@patch("handler.boto3")
@patch("handler._firehose_client", None)
def test_handler_processes_kafka_event_and_writes_to_firehose(
    mock_boto3, kafka_event, lambda_context, env_vars
):
    """Test end-to-end handler processing."""
    # Reset global client to ensure mock is used
    import handler as h
    h._firehose_client = None

    mock_firehose = MagicMock()
    mock_boto3.client.return_value = mock_firehose
    mock_firehose.put_record_batch.return_value = {"FailedPutCount": 0}

    response = handler(kafka_event, lambda_context)

    # Should have called Firehose
    assert mock_firehose.put_record_batch.called

    # Response should include summary
    assert "statusCode" in response
    assert response["statusCode"] == 200
    assert "total_kafka_records" in response["body"]
    assert "total_row_events" in response["body"]


@patch("handler.boto3")
def test_handler_returns_summary_counts(
    mock_boto3, kafka_event, lambda_context, env_vars
):
    """Test that handler returns correct summary counts."""
    # Reset global client
    import handler as h
    h._firehose_client = None

    mock_firehose = MagicMock()
    mock_boto3.client.return_value = mock_firehose
    mock_firehose.put_record_batch.return_value = {"FailedPutCount": 0}

    response = handler(kafka_event, lambda_context)

    body = response["body"]
    assert body["total_kafka_records"] == 1
    # OTLP bundle fixture has 1 datapoint, so 1 row event
    assert body["total_row_events"] == 1
    assert body["total_firehose_records"] == 1
    assert body["failed_records"] == 0


@patch("handler.boto3")
def test_handler_handles_empty_event(
    mock_boto3, lambda_context, env_vars
):
    """Test that handler gracefully handles empty events."""
    empty_event = {
        "eventSource": "aws:kafka",
        "records": {}
    }

    response = handler(empty_event, lambda_context)

    assert response["statusCode"] == 200
    assert response["body"]["total_kafka_records"] == 0
    assert response["body"]["total_row_events"] == 0


@patch("handler.boto3")
def test_handler_handles_firehose_errors(
    mock_boto3, kafka_event, lambda_context, env_vars
):
    """Test that handler reports errors when Firehose fails."""
    # Reset global client
    import handler as h
    h._firehose_client = None

    mock_firehose = MagicMock()
    mock_boto3.client.return_value = mock_firehose

    # Simulate complete failure (with max retries exhausted)
    mock_firehose.put_record_batch.return_value = {
        "FailedPutCount": 1,
        "RequestResponses": [{"ErrorCode": "ServiceUnavailable"}]
    }

    response = handler(kafka_event, lambda_context)

    # Should still return 200 but report failures
    assert response["statusCode"] == 200
    assert response["body"]["failed_records"] > 0


def test_handler_uses_environment_variables(kafka_event, lambda_context, monkeypatch):
    """Test that handler reads configuration from environment variables."""
    monkeypatch.setenv("FIREHOSE_STREAM_NAME", "custom-stream")
    monkeypatch.setenv("BATCH_SIZE", "100")

    with patch("handler.boto3") as mock_boto3:
        # Reset global client
        import handler as h
        h._firehose_client = None

        mock_firehose = MagicMock()
        mock_boto3.client.return_value = mock_firehose
        mock_firehose.put_record_batch.return_value = {"FailedPutCount": 0}

        handler(kafka_event, lambda_context)

        # Verify stream name used
        call_args = mock_firehose.put_record_batch.call_args
        assert call_args[1]["DeliveryStreamName"] == "custom-stream"
