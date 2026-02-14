# Description: CloudFormation Custom Resource handler for Snowflake DDL setup
# Description: Creates database, schema, table, and warehouse via key-pair auth

import json
import logging
import traceback
import urllib.request
from typing import Any

import boto3

logger = logging.getLogger()
logger.setLevel(logging.INFO)


def parse_account_identifier(account_url: str) -> str:
    """Extract the account identifier from a Snowflake account URL.

    Accepts formats:
      - https://org-acct.snowflakecomputing.com
      - org-acct.snowflakecomputing.com
      - org-acct (plain identifier)
    """
    url = account_url.strip().rstrip("/")
    # Strip scheme
    if "://" in url:
        url = url.split("://", 1)[1]
    # Strip domain suffix
    if ".snowflakecomputing.com" in url:
        url = url.split(".snowflakecomputing.com")[0]
    return url


def build_table_ddl(database: str, schema: str, table: str) -> str:
    """Build the CREATE TABLE DDL for the ROW_EVENTS table.

    Quoted identifiers preserve lowercase to match flatten.py JSON output keys.
    """
    return f"""CREATE TABLE IF NOT EXISTS {database}.{schema}.{table} (
    "orgId"      VARCHAR NOT NULL,
    "deviceId"   VARCHAR NOT NULL,
    "deviceName" VARCHAR,
    "datasource" VARCHAR NOT NULL,
    "instance"   VARCHAR,
    "metric"     VARCHAR NOT NULL,
    "unit"       VARCHAR,
    "type"       VARCHAR NOT NULL,
    "ts"         VARCHAR NOT NULL,
    "tsUnixMs"   NUMBER NOT NULL,
    "value"      FLOAT NOT NULL,
    "attributes" VARIANT,
    "resource"   VARIANT,
    "scope"      VARIANT
)"""


def build_create_ddl(
    database: str, schema: str, table: str, warehouse: str
) -> list[str]:
    """Build the full set of DDL statements for Snowflake setup."""
    return [
        f"CREATE DATABASE IF NOT EXISTS {database}",
        f"CREATE SCHEMA IF NOT EXISTS {database}.{schema}",
        (
            f"CREATE WAREHOUSE IF NOT EXISTS {warehouse}"
            f" WITH WAREHOUSE_SIZE='XSMALL' AUTO_SUSPEND=60 AUTO_RESUME=TRUE"
        ),
        build_table_ddl(database, schema, table),
    ]


def get_snowflake_credentials(secret_arn: str) -> dict:
    """Retrieve Snowflake credentials from Secrets Manager."""
    client = boto3.client("secretsmanager")
    response = client.get_secret_value(SecretId=secret_arn)
    return json.loads(response["SecretString"])


def execute_ddl(statements: list[str], secret_arn: str, account_url: str) -> None:
    """Connect to Snowflake and execute DDL statements.

    Uses key-pair authentication via credentials from Secrets Manager.
    """
    import snowflake.connector

    creds = get_snowflake_credentials(secret_arn)
    account = parse_account_identifier(account_url)

    conn = snowflake.connector.connect(
        user=creds["user"],
        private_key=creds["privateKey"],
        account=account,
    )
    try:
        cursor = conn.cursor()
        for stmt in statements:
            logger.info("Executing DDL: %s", stmt[:120])
            cursor.execute(stmt)
        cursor.close()
    finally:
        conn.close()


def send_cfn_response(
    event: dict, context: Any, status: str, reason: str = ""
) -> None:
    """Send response back to CloudFormation."""
    body = json.dumps({
        "Status": status,
        "Reason": reason or f"See CloudWatch Log Stream: {context.log_stream_name}",
        "PhysicalResourceId": event.get("LogicalResourceId", "SnowflakeSetup"),
        "StackId": event["StackId"],
        "RequestId": event["RequestId"],
        "LogicalResourceId": event["LogicalResourceId"],
        "Data": {},
    })

    req = urllib.request.Request(
        event["ResponseURL"],
        data=body.encode("utf-8"),
        headers={"Content-Type": ""},
        method="PUT",
    )
    urllib.request.urlopen(req)


def handler(event: dict, context: Any) -> None:
    """CloudFormation Custom Resource handler.

    - CREATE: Runs DDL to create database, schema, table, warehouse
    - UPDATE: Runs DDL (all statements use IF NOT EXISTS, safe to re-run)
    - DELETE: No-op by default (retains data)
    """
    logger.info("Received event: %s", json.dumps(event, default=str))
    request_type = event["RequestType"]

    try:
        if request_type in ("Create", "Update"):
            props = event["ResourceProperties"]
            statements = build_create_ddl(
                database=props["Database"],
                schema=props["Schema"],
                table=props["Table"],
                warehouse=props["Warehouse"],
            )
            execute_ddl(
                statements=statements,
                secret_arn=props["SecretArn"],
                account_url=props["AccountUrl"],
            )
            logger.info("DDL execution completed for %s", request_type)
        else:
            # Delete: retain data by default
            logger.info("Delete request — retaining Snowflake objects")

        send_cfn_response(event, context, "SUCCESS")

    except Exception as e:
        logger.error("Failed: %s\n%s", str(e), traceback.format_exc())
        send_cfn_response(event, context, "FAILED", reason=str(e))
