# ABOUTME: Loads and parses the kafka_ingest_spec.md specification
# ABOUTME: Extracts schema definitions and field mappings for OTLP to Row Event transformation

import json
import re
import yaml
from pathlib import Path
from typing import Dict, List, Any, Optional


class SpecLoader:
    """Loads and validates the OTLP to Row Event specification from kafka_ingest_spec.md."""

    def __init__(self, spec_path: Optional[Path] = None):
        """
        Initialize the spec loader.

        Args:
            spec_path: Path to kafka_ingest_spec.md. If None, uses default location.
        """
        if spec_path is None:
            # Default to docs/kafka_ingest_spec.md relative to project root
            self.spec_path = Path(__file__).parent.parent / "docs" / "kafka_ingest_spec.md"
        else:
            self.spec_path = Path(spec_path)

        self._spec_content = None
        self._schema = None
        self._fixtures = None

    def load_spec(self) -> str:
        """Load the spec file content."""
        if self._spec_content is None:
            with open(self.spec_path, "r", encoding="utf-8") as f:
                self._spec_content = f.read()
        return self._spec_content

    def extract_yaml_blocks(self) -> List[Dict[str, Any]]:
        """
        Extract all YAML code blocks from the spec.

        Returns:
            List of parsed YAML blocks as dictionaries
        """
        content = self.load_spec()
        yaml_pattern = r"```yaml\n(.*?)\n```"
        matches = re.findall(yaml_pattern, content, re.DOTALL)

        yaml_blocks = []
        for match in matches:
            try:
                parsed = yaml.safe_load(match)
                if parsed:
                    yaml_blocks.append(parsed)
            except yaml.YAMLError as e:
                print(f"Warning: Failed to parse YAML block: {e}")
                continue

        return yaml_blocks

    def extract_json_blocks(self) -> List[Dict[str, Any]]:
        """
        Extract all JSON code blocks from the spec.

        Returns:
            List of parsed JSON blocks as dictionaries
        """
        content = self.load_spec()
        json_pattern = r"```json\n(.*?)\n```"
        matches = re.findall(json_pattern, content, re.DOTALL)

        json_blocks = []
        for match in matches:
            try:
                parsed = json.loads(match)
                if parsed:
                    json_blocks.append(parsed)
            except json.JSONDecodeError as e:
                print(f"Warning: Failed to parse JSON block: {e}")
                continue

        return json_blocks

    def get_row_event_schema(self) -> Dict[str, Any]:
        """
        Get the Row Event schema definition from the spec.

        Returns:
            Dictionary containing schema fields and constraints
        """
        if self._schema is not None:
            return self._schema

        yaml_blocks = self.extract_yaml_blocks()

        # Find the schema block
        for block in yaml_blocks:
            if isinstance(block, dict) and "schema" in block:
                schema_def = block["schema"]
                if schema_def.get("name") == "lm.kafka.row_event":
                    self._schema = block
                    return self._schema

        raise ValueError("Row Event schema not found in spec")

    def get_required_fields(self) -> List[str]:
        """
        Get list of required field names from the schema.

        Returns:
            List of required field names
        """
        schema = self.get_row_event_schema()
        fields = schema.get("fields", [])

        required = []
        for field in fields:
            if field.get("required", False):
                required.append(field["name"])

        # Also check validation section
        validation = schema.get("validation", {})
        if "required_fields" in validation:
            required.extend(validation["required_fields"])

        return list(set(required))  # Remove duplicates

    def get_field_types(self) -> Dict[str, str]:
        """
        Get mapping of field names to their types.

        Returns:
            Dictionary mapping field name to type
        """
        schema = self.get_row_event_schema()
        fields = schema.get("fields", [])

        field_types = {}
        for field in fields:
            field_types[field["name"]] = field["type"]

        return field_types

    def get_fixtures(self) -> Dict[str, Any]:
        """
        Get test fixtures from the spec.

        Returns:
            Dictionary of fixture definitions
        """
        if self._fixtures is not None:
            return self._fixtures

        yaml_blocks = self.extract_yaml_blocks()

        # Find the fixtures block
        for block in yaml_blocks:
            if isinstance(block, dict) and "fixtures" in block:
                self._fixtures = block["fixtures"]
                return self._fixtures

        return {}

    def validate_row_event(self, event: Dict[str, Any]) -> bool:
        """
        Validate a row event against the schema.

        Args:
            event: Row event dictionary to validate

        Returns:
            True if valid, False otherwise
        """
        required = self.get_required_fields()
        field_types = self.get_field_types()

        # Check all required fields present
        for field in required:
            if field not in event:
                return False

        # Check field types (basic validation)
        for field_name, field_type in field_types.items():
            if field_name in event:
                value = event[field_name]
                # Basic type checking
                if field_type == "string" and not isinstance(value, str):
                    return False
                elif field_type == "int" and not isinstance(value, int):
                    return False
                elif field_type == "number" and not isinstance(value, (int, float)):
                    return False
                elif field_type == "object" and not isinstance(value, dict):
                    return False

        return True
