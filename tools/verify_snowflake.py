# Description: Smoke test tool to verify data landed in Snowflake ROW_EVENTS table
# Description: Connects via key-pair auth, queries row counts and sample data for validation

import argparse
import json
import os
import sys

try:
    import snowflake.connector
except ImportError:
    print("snowflake-connector-python is required: pip install snowflake-connector-python")
    sys.exit(1)


def get_connection(account_url: str, user: str, private_key_path: str, database: str, schema: str, warehouse: str):
    """
    Connect to Snowflake using key-pair authentication.

    Args:
        account_url: Snowflake account URL (e.g., https://xyz.snowflakecomputing.com)
        user: Snowflake service user
        private_key_path: Path to PEM-encoded private key file
        database: Target database name
        schema: Target schema name
        warehouse: Warehouse to use for queries
    """
    from cryptography.hazmat.primitives import serialization
    from cryptography.hazmat.backends import default_backend

    with open(private_key_path, "rb") as f:
        private_key = serialization.load_pem_private_key(
            f.read(),
            password=None,
            backend=default_backend(),
        )

    private_key_bytes = private_key.private_bytes(
        encoding=serialization.Encoding.DER,
        format=serialization.PrivateFormat.PKCS8,
        encryption_algorithm=serialization.NoEncryption(),
    )

    # Extract account identifier from URL
    account = account_url.replace("https://", "").replace(".snowflakecomputing.com", "")

    return snowflake.connector.connect(
        account=account,
        user=user,
        private_key=private_key_bytes,
        database=database,
        schema=schema,
        warehouse=warehouse,
    )


def verify_row_count(conn, table: str, expected_min: int = 1) -> bool:
    """Check that the table has at least expected_min rows."""
    cursor = conn.cursor()
    cursor.execute(f"SELECT COUNT(*) FROM {table}")
    count = cursor.fetchone()[0]
    cursor.close()

    print(f"Row count in {table}: {count}")
    if count >= expected_min:
        print(f"  PASS: {count} >= {expected_min}")
        return True
    else:
        print(f"  FAIL: {count} < {expected_min}")
        return False


def verify_sample_data(conn, table: str, limit: int = 5) -> bool:
    """Fetch and display sample rows for manual inspection."""
    cursor = conn.cursor()
    cursor.execute(f'SELECT * FROM {table} ORDER BY "tsUnixMs" DESC LIMIT {limit}')
    columns = [desc[0] for desc in cursor.description]
    rows = cursor.fetchall()
    cursor.close()

    if not rows:
        print("  No rows found")
        return False

    print(f"\nSample data ({len(rows)} rows):")
    print(f"  Columns: {columns}")
    for i, row in enumerate(rows):
        row_dict = dict(zip(columns, row))
        print(f"  [{i+1}] orgId={row_dict.get('orgId')}, "
              f"deviceId={row_dict.get('deviceId')}, "
              f"metric={row_dict.get('metric')}, "
              f"value={row_dict.get('value')}, "
              f"ts={row_dict.get('ts')}")
    return True


def verify_recent_data(conn, table: str, minutes: int = 30) -> bool:
    """Check that data arrived within the last N minutes."""
    cursor = conn.cursor()
    cursor.execute(
        f'SELECT COUNT(*) FROM {table} WHERE "tsUnixMs" > '
        f"EXTRACT(EPOCH FROM DATEADD(MINUTE, -{minutes}, CURRENT_TIMESTAMP())) * 1000"
    )
    count = cursor.fetchone()[0]
    cursor.close()

    print(f"\nRows in last {minutes} minutes: {count}")
    if count > 0:
        print(f"  PASS: Fresh data found")
        return True
    else:
        print(f"  WARN: No data in last {minutes} minutes (may be expected for historical fixtures)")
        return True  # Not a hard failure for fixture data


def main():
    parser = argparse.ArgumentParser(description="Verify data in Snowflake ROW_EVENTS table")
    parser.add_argument("--account-url", default=os.environ.get("SNOWFLAKE_ACCOUNT_URL"), help="Snowflake account URL")
    parser.add_argument("--user", default=os.environ.get("SNOWFLAKE_USER", "LM_FIREHOSE_SVC"), help="Snowflake user")
    parser.add_argument("--private-key", default=os.environ.get("SNOWFLAKE_PRIVATE_KEY_PATH"), help="Path to private key PEM")
    parser.add_argument("--database", default=os.environ.get("SNOWFLAKE_DATABASE", "LM_METRICS"), help="Database name")
    parser.add_argument("--schema", default=os.environ.get("SNOWFLAKE_SCHEMA", "PIPELINE"), help="Schema name")
    parser.add_argument("--table", default=os.environ.get("SNOWFLAKE_TABLE", "ROW_EVENTS"), help="Table name")
    parser.add_argument("--warehouse", default=os.environ.get("SNOWFLAKE_WAREHOUSE", "LM_FIREHOSE_WH"), help="Warehouse name")
    parser.add_argument("--min-rows", type=int, default=1, help="Minimum expected row count")

    args = parser.parse_args()

    if not args.account_url:
        print("--account-url or SNOWFLAKE_ACCOUNT_URL is required")
        sys.exit(1)
    if not args.private_key:
        print("--private-key or SNOWFLAKE_PRIVATE_KEY_PATH is required")
        sys.exit(1)

    print(f"Connecting to Snowflake: {args.account_url}")
    print(f"  Database: {args.database}.{args.schema}.{args.table}")
    print(f"  Warehouse: {args.warehouse}")
    print(f"  User: {args.user}")
    print()

    conn = get_connection(
        account_url=args.account_url,
        user=args.user,
        private_key_path=args.private_key,
        database=args.database,
        schema=args.schema,
        warehouse=args.warehouse,
    )

    table_ref = f'"{args.database}"."{args.schema}"."{args.table}"'

    all_passed = True
    all_passed &= verify_row_count(conn, table_ref, expected_min=args.min_rows)
    all_passed &= verify_sample_data(conn, table_ref)
    all_passed &= verify_recent_data(conn, table_ref)

    conn.close()

    if all_passed:
        print("\nAll checks PASSED")
        sys.exit(0)
    else:
        print("\nSome checks FAILED")
        sys.exit(1)


if __name__ == "__main__":
    main()
