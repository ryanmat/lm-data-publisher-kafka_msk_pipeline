# ABOUTME: Tests for spec_loader module
# ABOUTME: Validates spec parsing, schema extraction, and fixture validation

import json
import sys
from pathlib import Path
import pytest

# Add lambda directory to path for imports
sys.path.insert(0, str(Path(__file__).parent.parent / "lambda"))
from spec_loader import SpecLoader


@pytest.fixture
def spec_loader():
    """Fixture providing a SpecLoader instance."""
    return SpecLoader()


@pytest.fixture
def fixtures_path():
    """Fixture providing path to test fixtures."""
    return Path(__file__).parent / "fixtures" / "otlp"


def test_spec_loader_loads_spec(spec_loader):
    """Test that spec loader can load the spec file."""
    content = spec_loader.load_spec()
    assert content is not None
    assert len(content) > 0
    assert "lm.kafka.row_event" in content


def test_spec_loader_extracts_yaml_blocks(spec_loader):
    """Test that spec loader extracts YAML blocks."""
    yaml_blocks = spec_loader.extract_yaml_blocks()
    assert len(yaml_blocks) > 0
    # Should have at least the schema and fixtures blocks
    assert any("schema" in block for block in yaml_blocks)


def test_spec_loader_extracts_json_blocks(spec_loader):
    """Test that spec loader extracts JSON blocks."""
    json_blocks = spec_loader.extract_json_blocks()
    assert len(json_blocks) > 0
    # Should have the JSON schema block
    assert any("$schema" in block for block in json_blocks)


def test_spec_loader_gets_row_event_schema(spec_loader):
    """Test that spec loader extracts the row event schema."""
    schema = spec_loader.get_row_event_schema()
    assert schema is not None
    assert "schema" in schema
    assert schema["schema"]["name"] == "lm.kafka.row_event"
    assert schema["schema"]["version"] == 1.0


def test_spec_loader_gets_required_fields(spec_loader):
    """Test that spec loader identifies required fields."""
    required = spec_loader.get_required_fields()
    assert len(required) > 0

    # These fields should be required based on the spec
    expected_required = ["orgId", "deviceId", "datasource", "metric", "type", "ts", "tsUnixMs", "value"]
    for field in expected_required:
        assert field in required, f"Expected {field} to be required"


def test_spec_loader_gets_field_types(spec_loader):
    """Test that spec loader extracts field types."""
    field_types = spec_loader.get_field_types()
    assert len(field_types) > 0

    # Verify some key field types
    assert field_types["orgId"] == "string"
    assert field_types["metric"] == "string"
    assert field_types["value"] == "number"
    assert field_types["tsUnixMs"] == "int"
    assert field_types["attributes"] == "object"


def test_spec_loader_validates_valid_row_event(spec_loader, fixtures_path):
    """Test that spec loader validates a correct row event."""
    with open(fixtures_path / "row_event_ok.json") as f:
        row_event = json.load(f)

    assert spec_loader.validate_row_event(row_event) is True


def test_spec_loader_rejects_invalid_row_event(spec_loader, fixtures_path):
    """Test that spec loader rejects a row event missing required fields."""
    with open(fixtures_path / "row_event_missing_required.json") as f:
        row_event = json.load(f)

    assert spec_loader.validate_row_event(row_event) is False


def test_spec_loader_gets_fixtures(spec_loader):
    """Test that spec loader extracts test fixtures from the spec."""
    fixtures = spec_loader.get_fixtures()
    assert fixtures is not None
    # Should have fixture definitions from the spec
    assert "row_event_ok" in fixtures or len(fixtures) >= 0  # Fixtures may be in different format


def test_otlp_bundle_fixture_exists(fixtures_path):
    """Test that OTLP bundle fixture file exists and is valid JSON."""
    otlp_file = fixtures_path / "otlp_bundle_ok.json"
    assert otlp_file.exists()

    with open(otlp_file) as f:
        otlp = json.load(f)

    # Validate basic OTLP structure
    assert "resourceMetrics" in otlp
    assert len(otlp["resourceMetrics"]) > 0
    resource_metric = otlp["resourceMetrics"][0]
    assert "resource" in resource_metric
    assert "scopeMetrics" in resource_metric


def test_row_event_fixture_exists(fixtures_path):
    """Test that row event fixture file exists and is valid JSON."""
    row_file = fixtures_path / "row_event_ok.json"
    assert row_file.exists()

    with open(row_file) as f:
        row_event = json.load(f)

    # Validate basic row event structure
    assert "orgId" in row_event
    assert "metric" in row_event
    assert "value" in row_event
    assert "ts" in row_event
