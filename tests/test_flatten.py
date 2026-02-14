# ABOUTME: Tests for flatten module
# ABOUTME: Validates OTLP bundle to row events transformation with property and fixture tests

import json
import sys
from pathlib import Path
from datetime import datetime, timezone
import pytest

# Add lambda directory to path for imports
sys.path.insert(0, str(Path(__file__).parent.parent / "lambda"))
from flatten import flatten_otlp
from spec_loader import SpecLoader


@pytest.fixture
def spec_loader():
    """Fixture providing a SpecLoader instance."""
    return SpecLoader()


@pytest.fixture
def spec(spec_loader):
    """Fixture providing the parsed spec."""
    return spec_loader.get_row_event_schema()


@pytest.fixture
def fixtures_path():
    """Fixture providing path to test fixtures."""
    return Path(__file__).parent / "fixtures" / "otlp"


@pytest.fixture
def otlp_bundle(fixtures_path):
    """Fixture providing a valid OTLP bundle."""
    with open(fixtures_path / "otlp_bundle_ok.json") as f:
        return json.load(f)


def test_flatten_otlp_returns_list(otlp_bundle, spec):
    """Test that flatten_otlp returns a list."""
    result = flatten_otlp(otlp_bundle, spec)
    assert isinstance(result, list)


def test_flatten_otlp_produces_rows_from_datapoints(otlp_bundle, spec):
    """Test that flatten_otlp produces one row per datapoint."""
    result = flatten_otlp(otlp_bundle, spec)

    # Count datapoints in the bundle
    datapoint_count = 0
    for resource_metric in otlp_bundle.get("resourceMetrics", []):
        for scope_metric in resource_metric.get("scopeMetrics", []):
            for metric in scope_metric.get("metrics", []):
                if "gauge" in metric:
                    datapoint_count += len(metric["gauge"].get("dataPoints", []))
                if "sum" in metric:
                    datapoint_count += len(metric["sum"].get("dataPoints", []))

    assert len(result) == datapoint_count


def test_flatten_otlp_extracts_metric_name(otlp_bundle, spec):
    """Test that metric name is extracted correctly."""
    result = flatten_otlp(otlp_bundle, spec)

    assert len(result) > 0
    row = result[0]
    assert "metric" in row
    assert row["metric"] == "cpu.utilization"


def test_flatten_otlp_extracts_value(otlp_bundle, spec):
    """Test that value is extracted from asDouble or asInt."""
    result = flatten_otlp(otlp_bundle, spec)

    assert len(result) > 0
    row = result[0]
    assert "value" in row
    assert row["value"] == 42.7


def test_flatten_otlp_determines_type(otlp_bundle, spec):
    """Test that metric type (gauge/sum) is determined correctly."""
    result = flatten_otlp(otlp_bundle, spec)

    assert len(result) > 0
    row = result[0]
    assert "type" in row
    assert row["type"] in ["gauge", "sum"]
    # This fixture uses gauge
    assert row["type"] == "gauge"


def test_flatten_otlp_converts_timestamp_to_unix_ms(otlp_bundle, spec):
    """Test that timeUnixNano is converted to milliseconds."""
    result = flatten_otlp(otlp_bundle, spec)

    assert len(result) > 0
    row = result[0]
    assert "tsUnixMs" in row
    assert isinstance(row["tsUnixMs"], int)
    # 1768646400000000000 nanos = 1768646400000 ms
    assert row["tsUnixMs"] == 1768646400000


def test_flatten_otlp_converts_timestamp_to_rfc3339(otlp_bundle, spec):
    """Test that timestamp is converted to RFC3339 format."""
    result = flatten_otlp(otlp_bundle, spec)

    assert len(result) > 0
    row = result[0]
    assert "ts" in row
    assert isinstance(row["ts"], str)
    # Verify it's valid RFC3339
    datetime.fromisoformat(row["ts"].replace("Z", "+00:00"))


def test_flatten_otlp_timestamp_consistency(otlp_bundle, spec):
    """Test that ts and tsUnixMs represent the same moment."""
    result = flatten_otlp(otlp_bundle, spec)

    assert len(result) > 0
    row = result[0]

    # Parse the RFC3339 timestamp
    ts_dt = datetime.fromisoformat(row["ts"].replace("Z", "+00:00"))
    # Convert to Unix ms
    ts_unix_ms = int(ts_dt.timestamp() * 1000)

    # Should match tsUnixMs (within 1ms tolerance per spec)
    assert abs(ts_unix_ms - row["tsUnixMs"]) <= 1


def test_flatten_otlp_promotes_org_id(otlp_bundle, spec):
    """Test that orgId is promoted to top level."""
    result = flatten_otlp(otlp_bundle, spec)

    assert len(result) > 0
    row = result[0]
    assert "orgId" in row
    assert row["orgId"] == "acme"


def test_flatten_otlp_promotes_device_id(otlp_bundle, spec):
    """Test that deviceId is promoted from resource.hostId."""
    result = flatten_otlp(otlp_bundle, spec)

    assert len(result) > 0
    row = result[0]
    assert "deviceId" in row
    assert row["deviceId"] == "i-abc"


def test_flatten_otlp_promotes_device_name(otlp_bundle, spec):
    """Test that deviceName is promoted from resource.hostName."""
    result = flatten_otlp(otlp_bundle, spec)

    assert len(result) > 0
    row = result[0]
    assert "deviceName" in row
    assert row["deviceName"] == "acme-prod-web-01"


def test_flatten_otlp_promotes_datasource(otlp_bundle, spec):
    """Test that datasource is promoted from scope.name."""
    result = flatten_otlp(otlp_bundle, spec)

    assert len(result) > 0
    row = result[0]
    assert "datasource" in row
    assert row["datasource"] == "aws.ec2"


def test_flatten_otlp_promotes_instance(otlp_bundle, spec):
    """Test that instance is promoted from dataSourceInstanceName."""
    result = flatten_otlp(otlp_bundle, spec)

    assert len(result) > 0
    row = result[0]
    assert "instance" in row
    assert row["instance"] == "cpu_total"


def test_flatten_otlp_includes_unit(otlp_bundle, spec):
    """Test that unit is included when present."""
    result = flatten_otlp(otlp_bundle, spec)

    assert len(result) > 0
    row = result[0]
    assert "unit" in row
    assert row["unit"] == "percent"


def test_flatten_otlp_includes_flattened_attributes(otlp_bundle, spec):
    """Test that datapoint attributes are flattened and included."""
    result = flatten_otlp(otlp_bundle, spec)

    assert len(result) > 0
    row = result[0]
    assert "attributes" in row
    assert isinstance(row["attributes"], dict)
    # Should include wildAlias (not promoted)
    assert "wildAlias" in row["attributes"]
    assert row["attributes"]["wildAlias"] == "CPU Total"


def test_flatten_otlp_includes_flattened_resource(otlp_bundle, spec):
    """Test that resource attributes are flattened and included."""
    result = flatten_otlp(otlp_bundle, spec)

    assert len(result) > 0
    row = result[0]
    assert "resource" in row
    assert isinstance(row["resource"], dict)


def test_flatten_otlp_includes_scope_info(otlp_bundle, spec):
    """Test that scope information is included."""
    result = flatten_otlp(otlp_bundle, spec)

    assert len(result) > 0
    row = result[0]
    assert "scope" in row
    assert isinstance(row["scope"], dict)


def test_flatten_otlp_with_multiple_datapoints():
    """Test fan-out with multiple datapoints in one bundle."""
    spec = SpecLoader().get_row_event_schema()

    # Create bundle with 2 datapoints
    bundle = {
        "resourceMetrics": [{
            "resource": {
                "attributes": [
                    {"key": "hostId", "value": {"stringValue": "host1"}},
                    {"key": "orgId", "value": {"stringValue": "org1"}}
                ]
            },
            "scopeMetrics": [{
                "scope": {"name": "test.datasource"},
                "metrics": [{
                    "name": "test.metric",
                    "gauge": {
                        "dataPoints": [
                            {"timeUnixNano": "1000000000000000000", "asDouble": 1.0},
                            {"timeUnixNano": "2000000000000000000", "asDouble": 2.0}
                        ]
                    }
                }]
            }]
        }]
    }

    result = flatten_otlp(bundle, spec)

    # Should produce 2 rows
    assert len(result) == 2
    assert result[0]["value"] == 1.0
    assert result[1]["value"] == 2.0
    assert result[0]["tsUnixMs"] == 1000000000000
    assert result[1]["tsUnixMs"] == 2000000000000


def test_flatten_otlp_with_empty_bundle(spec):
    """Test that empty bundle returns empty list."""
    bundle = {"resourceMetrics": []}
    result = flatten_otlp(bundle, spec)
    assert result == []


def test_flatten_otlp_handles_missing_optional_fields(spec):
    """Test that missing optional fields don't cause errors."""
    bundle = {
        "resourceMetrics": [{
            "resource": {"attributes": []},
            "scopeMetrics": [{
                "scope": {"name": "test"},
                "metrics": [{
                    "name": "test.metric",
                    "gauge": {
                        "dataPoints": [
                            {"timeUnixNano": "1000000000000000000", "asInt": 42}
                        ]
                    }
                }]
            }]
        }]
    }

    result = flatten_otlp(bundle, spec)
    assert len(result) == 1
    assert result[0]["value"] == 42
    assert result[0]["metric"] == "test.metric"


def test_flatten_otlp_uses_asInt_when_present(spec):
    """Test that asInt is used when asDouble is not present."""
    bundle = {
        "resourceMetrics": [{
            "resource": {"attributes": []},
            "scopeMetrics": [{
                "scope": {"name": "test"},
                "metrics": [{
                    "name": "test.metric",
                    "sum": {
                        "dataPoints": [
                            {"timeUnixNano": "1000000000000000000", "asInt": 100}
                        ]
                    }
                }]
            }]
        }]
    }

    result = flatten_otlp(bundle, spec)
    assert len(result) == 1
    assert result[0]["value"] == 100
    assert result[0]["type"] == "sum"


def test_flatten_otlp_metric_pattern_validation(otlp_bundle, spec):
    """Test that metric names follow lowercase dot.case pattern."""
    result = flatten_otlp(otlp_bundle, spec)

    assert len(result) > 0
    row = result[0]
    metric = row["metric"]

    # Should be lowercase with dots and underscores
    assert metric.islower() or "_" in metric or "." in metric
    # Should match pattern from spec: ^[a-z0-9_.]+$
    import re
    assert re.match(r"^[a-z0-9_.]+$", metric)


def test_flatten_otlp_includes_all_partitioning_fields(otlp_bundle, spec):
    """Test that all S3 partitioning fields are present in row events.

    Per kafka_ingest_spec.md, Firehose uses dynamic partitioning with:
    - orgId (from top-level field)
    - metric (from top-level field)
    - dt (derived from tsUnixMs in YYYY/MM/DD/HH format)

    This test validates that all required source fields are present.
    """
    result = flatten_otlp(otlp_bundle, spec)

    assert len(result) > 0
    row = result[0]

    # Verify all partitioning source fields are present
    assert "orgId" in row, "orgId required for S3 partitioning"
    assert "metric" in row, "metric required for S3 partitioning"
    assert "tsUnixMs" in row, "tsUnixMs required for date partitioning"

    # Verify field types
    assert isinstance(row["orgId"], str), "orgId must be string"
    assert isinstance(row["metric"], str), "metric must be string"
    assert isinstance(row["tsUnixMs"], int), "tsUnixMs must be integer"

    # Verify non-empty values
    assert row["orgId"], "orgId must not be empty"
    assert row["metric"], "metric must not be empty"
    assert row["tsUnixMs"] > 0, "tsUnixMs must be positive"
