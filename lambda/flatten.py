# ABOUTME: OTLP bundle to row events flattener (1-to-N transformation)
# ABOUTME: Pure function with no AWS dependencies for transforming OTLP bundles into row events

from typing import Dict, List, Any, Optional
from datetime import datetime, timezone


def flatten_otlp(otlp_bundle: Dict[str, Any], spec: Dict[str, Any]) -> List[Dict[str, Any]]:
    """
    Transform an OTLP bundle into a list of row events (1-to-N fan-out).

    Args:
        otlp_bundle: OTLP metrics bundle from LogicMonitor Data Publisher
        spec: Row Event schema specification

    Returns:
        List of row event dictionaries, one per datapoint

    The function walks:
        resourceMetrics → scopeMetrics → metrics → dataPoints
    and produces one row event per datapoint with promoted fields.
    """
    rows = []

    resource_metrics = otlp_bundle.get("resourceMetrics", [])

    for resource_metric in resource_metrics:
        # Extract and flatten resource attributes
        resource_attrs = _flatten_attributes(
            resource_metric.get("resource", {}).get("attributes", [])
        )

        # Promote key resource fields
        org_id = resource_attrs.get("orgId")
        device_id = resource_attrs.get("hostId")
        device_name = resource_attrs.get("hostName")

        scope_metrics = resource_metric.get("scopeMetrics", [])

        for scope_metric in scope_metrics:
            scope = scope_metric.get("scope", {})
            scope_name = scope.get("name")
            scope_version = scope.get("version")
            scope_epoch = scope.get("epoch")

            # Build scope info object
            scope_info = {}
            if scope_name:
                scope_info["name"] = scope_name
            if scope_version:
                scope_info["version"] = scope_version

            metrics = scope_metric.get("metrics", [])

            for metric in metrics:
                metric_name = metric.get("name")
                metric_unit = metric.get("unit")

                # Determine metric type and get datapoints
                metric_type = None
                datapoints = []

                if "gauge" in metric:
                    metric_type = "gauge"
                    datapoints = metric["gauge"].get("dataPoints", [])
                elif "sum" in metric:
                    metric_type = "sum"
                    datapoints = metric["sum"].get("dataPoints", [])

                # Process each datapoint
                for datapoint in datapoints:
                    row = _process_datapoint(
                        datapoint=datapoint,
                        metric_name=metric_name,
                        metric_unit=metric_unit,
                        metric_type=metric_type,
                        resource_attrs=resource_attrs,
                        scope_info=scope_info,
                        scope_epoch=scope_epoch,
                        org_id=org_id,
                        device_id=device_id,
                        device_name=device_name,
                        datasource=scope_name,
                    )
                    rows.append(row)

    return rows


def _process_datapoint(
    datapoint: Dict[str, Any],
    metric_name: str,
    metric_unit: Optional[str],
    metric_type: str,
    resource_attrs: Dict[str, Any],
    scope_info: Dict[str, Any],
    scope_epoch: Optional[str],
    org_id: Optional[str],
    device_id: Optional[str],
    device_name: Optional[str],
    datasource: Optional[str],
) -> Dict[str, Any]:
    """
    Process a single datapoint into a row event.

    Args:
        datapoint: OTLP datapoint
        metric_name: Metric name
        metric_unit: Metric unit (optional)
        metric_type: Metric type (gauge or sum)
        resource_attrs: Flattened resource attributes
        scope_info: Scope information
        scope_epoch: Scope epoch for timestamp fallback
        org_id: Organization ID (promoted)
        device_id: Device ID (promoted)
        device_name: Device name (promoted)
        datasource: Datasource name (promoted)

    Returns:
        Row event dictionary
    """
    # Extract value
    value = datapoint.get("asDouble", datapoint.get("asInt"))

    # Extract timestamp
    time_unix_nano = datapoint.get("timeUnixNano")
    if time_unix_nano:
        ts_unix_ms = int(int(time_unix_nano) / 1_000_000)
    elif scope_epoch:
        # Fallback to scope epoch (in seconds)
        ts_unix_ms = int(scope_epoch) * 1000
    else:
        # Default to current time if no timestamp available
        ts_unix_ms = int(datetime.now(timezone.utc).timestamp() * 1000)

    # Convert to RFC3339
    ts_rfc3339 = _unix_ms_to_rfc3339(ts_unix_ms)

    # Flatten datapoint attributes
    dp_attrs = _flatten_attributes(datapoint.get("attributes", []))

    # Promote instance field
    instance = dp_attrs.get("dataSourceInstanceName", dp_attrs.get("wildValue"))

    # Build attributes object (exclude promoted fields)
    attributes = {
        k: v
        for k, v in dp_attrs.items()
        if k not in ["dataSourceInstanceName", "wildValue"]
    }

    # Build resource object (exclude promoted fields)
    resource = {
        k: v
        for k, v in resource_attrs.items()
        if k not in ["orgId", "hostId", "hostName"]
    }

    # Build row event
    row = {
        "metric": metric_name,
        "type": metric_type,
        "value": value,
        "ts": ts_rfc3339,
        "tsUnixMs": ts_unix_ms,
    }

    # Add promoted fields if present
    if org_id:
        row["orgId"] = org_id
    if device_id:
        row["deviceId"] = device_id
    if device_name:
        row["deviceName"] = device_name
    if datasource:
        row["datasource"] = datasource
    if instance:
        row["instance"] = instance
    if metric_unit:
        row["unit"] = metric_unit

    # Add nested objects
    # Always include these objects to signal structure presence
    row["attributes"] = attributes if attributes else {}
    row["resource"] = resource if resource else {}
    row["scope"] = scope_info if scope_info else {}

    return row


def _flatten_attributes(attributes: List[Dict[str, Any]]) -> Dict[str, Any]:
    """
    Flatten OTLP attribute array to a simple key-value dict.

    Args:
        attributes: List of OTLP attribute objects with key and value

    Returns:
        Flattened dictionary with primitive values
    """
    flattened = {}

    for attr in attributes:
        key = attr.get("key")
        value_obj = attr.get("value", {})

        # Extract the actual value based on type
        value = None
        if "stringValue" in value_obj:
            value = value_obj["stringValue"]
        elif "intValue" in value_obj:
            value = value_obj["intValue"]
        elif "doubleValue" in value_obj:
            value = value_obj["doubleValue"]
        elif "boolValue" in value_obj:
            value = value_obj["boolValue"]

        if key and value is not None:
            flattened[key] = value

    return flattened


def _unix_ms_to_rfc3339(ts_unix_ms: int) -> str:
    """
    Convert Unix timestamp in milliseconds to RFC3339 format.

    Args:
        ts_unix_ms: Unix timestamp in milliseconds

    Returns:
        RFC3339 formatted timestamp string
    """
    dt = datetime.fromtimestamp(ts_unix_ms / 1000, tz=timezone.utc)
    return dt.isoformat().replace("+00:00", "Z")
