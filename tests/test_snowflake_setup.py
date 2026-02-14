# Description: Tests for Snowflake setup Custom Resource Lambda handler
# Description: Validates DDL generation, event parsing, and response formatting

import json
import os
import sys
from pathlib import Path
import pytest
from unittest.mock import patch, MagicMock

# Add lambda directory to path for imports (lambda is a Python keyword)
sys.path.insert(0, str(Path(__file__).parent.parent / "lambda"))

from snowflake_setup.handler import (
    build_create_ddl,
    build_table_ddl,
    parse_account_identifier,
    handler,
)


class TestBuildCreateDDL:
    """Tests for DDL statement generation."""

    def test_build_create_ddl_returns_list_of_statements(self):
        stmts = build_create_ddl(
            database="LM_METRICS",
            schema="PIPELINE",
            table="ROW_EVENTS",
            warehouse="LM_FIREHOSE_WH",
        )
        assert isinstance(stmts, list)
        assert len(stmts) > 0

    def test_build_create_ddl_contains_database_creation(self):
        stmts = build_create_ddl(
            database="LM_METRICS",
            schema="PIPELINE",
            table="ROW_EVENTS",
            warehouse="LM_FIREHOSE_WH",
        )
        db_stmts = [s for s in stmts if "CREATE DATABASE" in s.upper()]
        assert len(db_stmts) == 1
        assert "LM_METRICS" in db_stmts[0]

    def test_build_create_ddl_contains_schema_creation(self):
        stmts = build_create_ddl(
            database="LM_METRICS",
            schema="PIPELINE",
            table="ROW_EVENTS",
            warehouse="LM_FIREHOSE_WH",
        )
        schema_stmts = [s for s in stmts if "CREATE SCHEMA" in s.upper()]
        assert len(schema_stmts) == 1
        assert "PIPELINE" in schema_stmts[0]

    def test_build_create_ddl_contains_warehouse_creation(self):
        stmts = build_create_ddl(
            database="LM_METRICS",
            schema="PIPELINE",
            table="ROW_EVENTS",
            warehouse="LM_FIREHOSE_WH",
        )
        wh_stmts = [s for s in stmts if "CREATE WAREHOUSE" in s.upper()]
        assert len(wh_stmts) == 1
        assert "LM_FIREHOSE_WH" in wh_stmts[0]
        assert "XSMALL" in wh_stmts[0].upper()

    def test_build_create_ddl_uses_if_not_exists(self):
        stmts = build_create_ddl(
            database="LM_METRICS",
            schema="PIPELINE",
            table="ROW_EVENTS",
            warehouse="LM_FIREHOSE_WH",
        )
        for stmt in stmts:
            assert "IF NOT EXISTS" in stmt.upper()


class TestBuildTableDDL:
    """Tests for table DDL generation."""

    def test_build_table_ddl_returns_string(self):
        ddl = build_table_ddl(
            database="LM_METRICS",
            schema="PIPELINE",
            table="ROW_EVENTS",
        )
        assert isinstance(ddl, str)

    def test_build_table_ddl_contains_all_required_columns(self):
        ddl = build_table_ddl(
            database="LM_METRICS",
            schema="PIPELINE",
            table="ROW_EVENTS",
        )
        required_cols = [
            '"orgId"', '"deviceId"', '"datasource"', '"metric"',
            '"type"', '"ts"', '"tsUnixMs"', '"value"',
        ]
        for col in required_cols:
            assert col in ddl, f"Missing required column {col}"

    def test_build_table_ddl_contains_optional_columns(self):
        ddl = build_table_ddl(
            database="LM_METRICS",
            schema="PIPELINE",
            table="ROW_EVENTS",
        )
        optional_cols = [
            '"deviceName"', '"instance"', '"unit"',
            '"attributes"', '"resource"', '"scope"',
        ]
        for col in optional_cols:
            assert col in ddl, f"Missing optional column {col}"

    def test_build_table_ddl_uses_variant_for_json_columns(self):
        ddl = build_table_ddl(
            database="LM_METRICS",
            schema="PIPELINE",
            table="ROW_EVENTS",
        )
        assert "VARIANT" in ddl.upper()

    def test_build_table_ddl_uses_not_null_for_required_fields(self):
        ddl = build_table_ddl(
            database="LM_METRICS",
            schema="PIPELINE",
            table="ROW_EVENTS",
        )
        # orgId should be NOT NULL
        assert '"orgId"' in ddl
        # value should be FLOAT NOT NULL
        lines = ddl.split("\n")
        value_lines = [l for l in lines if '"value"' in l]
        assert len(value_lines) == 1
        assert "NOT NULL" in value_lines[0].upper()


class TestParseAccountIdentifier:
    """Tests for Snowflake account URL parsing."""

    def test_parse_full_url(self):
        result = parse_account_identifier("https://myorg-myacct.snowflakecomputing.com")
        assert result == "myorg-myacct"

    def test_parse_url_without_scheme(self):
        result = parse_account_identifier("myorg-myacct.snowflakecomputing.com")
        assert result == "myorg-myacct"

    def test_parse_url_with_trailing_slash(self):
        result = parse_account_identifier("https://myorg-myacct.snowflakecomputing.com/")
        assert result == "myorg-myacct"

    def test_parse_plain_identifier(self):
        result = parse_account_identifier("myorg-myacct")
        assert result == "myorg-myacct"


class TestHandler:
    """Tests for the CloudFormation Custom Resource handler."""

    def _make_event(self, request_type="Create"):
        return {
            "RequestType": request_type,
            "ServiceToken": "arn:aws:lambda:us-east-1:123456789012:function:test",
            "ResponseURL": "https://cloudformation-custom-resource-response-useast1.s3.amazonaws.com/test",
            "StackId": "arn:aws:cloudformation:us-east-1:123456789012:stack/test/guid",
            "RequestId": "test-request-id",
            "ResourceType": "Custom::SnowflakeSetup",
            "LogicalResourceId": "SnowflakeSetup",
            "ResourceProperties": {
                "ServiceToken": "arn:aws:lambda:us-east-1:123456789012:function:test",
                "AccountUrl": "https://test-org-test-acct.snowflakecomputing.com",
                "Database": "LM_METRICS",
                "Schema": "PIPELINE",
                "Table": "ROW_EVENTS",
                "Warehouse": "LM_FIREHOSE_WH",
                "SecretArn": "arn:aws:secretsmanager:us-east-1:123456789012:secret:test",
            },
        }

    @patch("snowflake_setup.handler.execute_ddl")
    @patch("snowflake_setup.handler.send_cfn_response")
    def test_handler_create_calls_execute_ddl(self, mock_send, mock_execute):
        mock_execute.return_value = None
        event = self._make_event("Create")
        handler(event, MagicMock())
        mock_execute.assert_called_once()

    @patch("snowflake_setup.handler.execute_ddl")
    @patch("snowflake_setup.handler.send_cfn_response")
    def test_handler_create_sends_success(self, mock_send, mock_execute):
        mock_execute.return_value = None
        event = self._make_event("Create")
        handler(event, MagicMock())
        mock_send.assert_called_once()
        call_args = mock_send.call_args
        assert call_args[0][2] == "SUCCESS"

    @patch("snowflake_setup.handler.execute_ddl")
    @patch("snowflake_setup.handler.send_cfn_response")
    def test_handler_update_calls_execute_ddl(self, mock_send, mock_execute):
        mock_execute.return_value = None
        event = self._make_event("Update")
        handler(event, MagicMock())
        mock_execute.assert_called_once()

    @patch("snowflake_setup.handler.execute_ddl")
    @patch("snowflake_setup.handler.send_cfn_response")
    def test_handler_delete_sends_success_without_ddl(self, mock_send, mock_execute):
        event = self._make_event("Delete")
        handler(event, MagicMock())
        # Default behavior: retain data on delete, so no DDL executed
        mock_execute.assert_not_called()
        mock_send.assert_called_once()
        call_args = mock_send.call_args
        assert call_args[0][2] == "SUCCESS"

    @patch("snowflake_setup.handler.execute_ddl")
    @patch("snowflake_setup.handler.send_cfn_response")
    def test_handler_failure_sends_failed(self, mock_send, mock_execute):
        mock_execute.side_effect = Exception("connection failed")
        event = self._make_event("Create")
        handler(event, MagicMock())
        mock_send.assert_called_once()
        call_args = mock_send.call_args
        assert call_args[0][2] == "FAILED"

    @patch("snowflake_setup.handler.execute_ddl")
    @patch("snowflake_setup.handler.send_cfn_response")
    def test_handler_passes_resource_properties_to_execute(self, mock_send, mock_execute):
        mock_execute.return_value = None
        event = self._make_event("Create")
        handler(event, MagicMock())
        call_args = mock_execute.call_args
        # Handler uses keyword arguments
        ddl_list = call_args.kwargs["statements"]
        assert isinstance(ddl_list, list)
        assert len(ddl_list) > 0
