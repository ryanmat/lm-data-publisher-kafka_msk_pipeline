# Kafka Ingest Spec (LogicMonitor → MSK → Pipes → Firehose → S3)
**Version:** 1.0  
**Status:** Stable (**DEFAULT pipeline:** EventBridge Pipe (MSK source) → **Lambda target fan‑out (1→N)** → Firehose → S3)

## 1. Purpose & Scope
This document defines the **canonical Row Event** we want stored in S3 and how to derive it from the **LogicMonitor Data Publisher (LMDP) OTLP JSON bundle**.

- **Mode A — Row Event (preferred for query):** one metric datapoint per record (target shape that lands in S3).
- **Mode B — OTLP Bundle (current LMDP output):** a single Kafka message per poll containing many datapoints. The **default pipeline fans out 1→N** in a Lambda **target** so Firehose receives row records.

> Pipes enrichment is 1→1. Because LMDP emits bundles, we use **Pipe target = Lambda** for row‑level fan‑out by default.

---

## 2. Mode A — Canonical **Row Event** (authoritative target shape)

### 2.1 YAML Spec
```yaml
schema:
  name: lm.kafka.row_event
  version: 1.0
  description: Single metric datapoint per event (row-level for Firehose/Athena)

fields:
  - { name: orgId,        type: string,  required: true,  desc: Tenant/account id }
  - { name: deviceId,     type: string,  required: true,  desc: LogicMonitor device id }
  - { name: deviceName,   type: string,  required: false, desc: LM device name/hostname }
  - { name: datasource,   type: string,  required: true,  desc: LM DataSource name }
  - { name: instance,     type: string,  required: false, desc: Instance identifier (wildValue or dataSourceInstanceName) }
  - { name: metric,       type: string,  required: true,  desc: Datapoint/metric name (dot.case) }
  - { name: unit,         type: string,  required: false, desc: Unit (OTel/UCUM), e.g., percent, bytes }
  - { name: type,         type: enum,    required: true,  enum: [gauge, sum], desc: Metric type }
  - { name: ts,           type: RFC3339, required: true,  desc: UTC timestamp }
  - { name: tsUnixMs,     type: int,     required: true,  desc: Epoch milliseconds }
  - { name: value,        type: number,  required: true,  desc: Numeric value }
  - { name: attributes,   type: object,  required: false, desc: Flat map of primitives (string|bool|int|double) }
  - { name: resource,     type: object,  required: false, desc: Flat map of resource attrs (from OTLP) }
  - { name: scope,        type: object,  required: false, desc: Instrumentation scope (from OTLP) }

constraints:
  - "ts and tsUnixMs must represent the same moment (±1ms allowed)"
  - "metric is lowercase dot.case; pattern ^[a-z0-9_.]+$"
  - "attributes/resource/scope values are primitives only"

partitioning:
  s3:
    keys:
      - { name: orgId }
      - { name: metric }
      - { name: dt, derive: 'YYYY/MM/DD/HH from tsUnixMs' }

eventbridge_filters:
  examples:
    - name: single-org
      pattern:
        value: { orgId: ['acme'] }
    - name: by-metric-prefix
      pattern:
        value: { metric: [{ 'prefix': 'cpu.' }] }

validation:
  max_record_size_bytes: 262144
  required_fields: [orgId, deviceId, datasource, metric, type, ts, tsUnixMs, value]
```

### 2.2 JSON Schema (Draft 2020‑12)
```json
{
  "$schema": "https://json-schema.org/draft/2020-12/schema",
  "$id": "https://logicmonitor.example/specs/lm.kafka.row_event/1-0.json",
  "title": "LM Kafka Row Event v1.0",
  "type": "object",
  "additionalProperties": false,
  "required": ["orgId","deviceId","datasource","metric","type","ts","tsUnixMs","value"],
  "properties": {
    "orgId":      { "type":"string", "minLength":1 },
    "deviceId":   { "type":"string", "minLength":1 },
    "deviceName": { "type":"string" },
    "datasource": { "type":"string", "minLength":1 },
    "instance":   { "type":"string" },
    "metric":     { "type":"string", "pattern":"^[a-z0-9_.]+$" },
    "unit":       { "type":"string" },
    "type":       { "type":"string", "enum":["gauge","sum"] },
    "ts":         { "type":"string", "format":"date-time" },
    "tsUnixMs":   { "type":"integer", "minimum":0 },
    "value":      { "type":"number" },
    "attributes": {
      "type":"object",
      "additionalProperties": {
        "oneOf":[
          { "type":"string" }, { "type":"boolean" },
          { "type":"integer" }, { "type":"number" }
        ]
      }
    },
    "resource": { "$ref":"#/definitions/kv" },
    "scope":    { "$ref":"#/definitions/kv" }
  },
  "definitions": {
    "kv": {
      "type":"object",
      "additionalProperties": {
        "oneOf":[
          { "type":"string" }, { "type":"boolean" },
          { "type":"integer" }, { "type":"number" }
        ]
      }
    }
  }
}
```

### 2.3 Example Row Events
```json
{
  "orgId": "acme",
  "deviceId": "i-0123456789abcdef0",
  "deviceName": "acme-prod-web-01",
  "datasource": "aws.ec2",
  "instance": "cpu_total",
  "metric": "cpu.utilization",
  "unit": "percent",
  "type": "gauge",
  "ts": "2025-11-17T00:00:00Z",
  "tsUnixMs": 1768646400000,
  "value": 42.7,
  "attributes": { "region":"us-east-1", "az":"use1-az1" },
  "resource": { "accountId":"123456789012" },
  "scope": { "instrumentation":"lmdp-1.0" }
}
```
```json
{
  "orgId": "acme",
  "deviceId": "db-01",
  "datasource": "postgres",
  "metric": "db.connections",
  "type": "sum",
  "ts": "2025-11-17T00:00:10Z",
  "tsUnixMs": 1768646410000,
  "value": 128
}
```

---

## 3. Mode B — OTLP **Bundle** (current LMDP output)

### 3.1 Accepted Input (shape)
A single Kafka message per poll with:
- `resourceMetrics[]`
  - `resource.attributes[]` (device metadata)
  - `scopeMetrics[]`
    - `scope` (DataSource metadata: name, collector, epoch, datasourceId, datasourceInstanceId)
    - `metrics[]`
      - `name` (datapoint name)
      - `{gauge|sum}.dataPoints[]`:
        - `startTimeUnixNano` / `timeUnixNano`
        - `asDouble` (value) or `asInt`
        - `attributes`:
          - `dataSourceInstanceName`
          - `datapointid`
          - `wildValue` (instance id)
          - `wildAlias` (instance display name)

### 3.2 Mapping (Bundle → N Row Events)
For each datapoint in each metric:
- `metric` ← `metrics[].name`
- `unit`   ← `metrics[].unit` (if present)
- `type`   ← `gauge` or `sum`
- `value`  ← `asDouble | asInt`
- `tsUnixMs` ← `floor(timeUnixNano / 1_000_000)` (or derive from `scope.epoch` if missing)
- `ts` ← RFC3339 from `tsUnixMs`
- `attributes` ← flattened key/value from datapoint attributes (primitives only)
- `resource`   ← flattened `resource.attributes`
- `scope`      ← `scope.name`, `scope.version`, `scope.collector` (if provided)
- Promote key metadata to top level when present:
  - `orgId` (if provided; else remain in attributes)
  - `deviceId` ← from `resource.hostId`
  - `deviceName` ← from `resource.hostName`
  - `datasource` ← from `scope.name`
  - `instance` ← from `attributes.dataSourceInstanceName` (fallback: `wildValue`)

### 3.3 LM‑specific attribute mapping (from Data Publisher format)
- `resource.hostName` → top-level `deviceName` (and duplicate to `attributes.hostname` if needed)
- `resource.hostId` → top-level `deviceId`
- `resource.<collector.publisher.device.props*>` → copy into `resource` map
- `scope.name` → `datasource`
- `scope.epoch` → derive seconds to ms for `tsUnixMs` when datapoint timestamp missing
- `metrics[].name` → `metric`
- `dataPoints[].attributes.dataSourceInstanceName` → `instance` (fallback to `wildValue`)
- `dataPoints[].attributes.datapointid` → `attributes.datapointId`
- `dataPoints[].attributes.wildAlias` → `attributes.instanceDisplayName`

---

## 4. Kafka & Eventing Conventions
- **Topic:** `lm.metrics.otlp`  
- **Kafka key (recommended):** `orgId/deviceId/metric/tsUnixMs` (string)  
- **Encoding:** UTF‑8 JSON (`kafka.send.data.in.String=true`)  
- **Partitioning:** by stable entity (e.g., deviceId hash) for within‑device ordering  
- **Max message size:** ≤ 256 KiB preferred

---

## 5. Partitioning & Filtering
- **S3 prefix strategy (Firehose dynamic partitioning):**  
  `s3://<bucket>/lm/metrics/orgId=<orgId>/metric=<metric>/dt=YYYY/MM/DD/HH/`
- **Pipes filtering:** Only apply **coarse filters** on bundle‑level fields (e.g., `resource.hostId`, `resource.hostName`). Fine‑grained filters happen in the Lambda target (after parsing).

---

## 6. Validation Rules
- `ts` is RFC3339 UTC; `tsUnixMs` integer; both represent same moment (±1ms)
- `metric` matches `^[a-z0-9_.]+$`
- `type` ∈ { `gauge`, `sum` }
- No NaN/Infinity
- attributes/resource/scope are **flat primitives**

---

## 7. Backward‑Compatibility & Versioning
- Non‑breaking: add optional fields  
- Breaking: change/remove required fields → bump major; consider new topic or header flag  
- Absence of explicit `schema.version` implies **1.0**

---

## 8. Test Fixtures (used by Prompts 2–4)
```yaml
fixtures:
  row_event_ok:
    json: |
      {
        "orgId":"acme","deviceId":"i-abc","datasource":"aws.ec2",
        "metric":"cpu.utilization","type":"gauge",
        "ts":"2025-11-17T00:00:00Z","tsUnixMs":1768646400000,"value":42.7,
        "attributes":{"region":"us-east-1"}
      }
  row_event_missing_required:
    json: |
      { "orgId":"acme","metric":"cpu.utilization","value":1 }
  otlp_bundle_ok:
    json: |
      {
        "resourceMetrics":[{
          "resource":{"attributes":[
            {"key":"hostId","value":{"stringValue":"i-abc"}},
            {"key":"hostName","value":{"stringValue":"acme-prod-web-01"}},
            {"key":"orgId","value":{"stringValue":"acme"}}
          ]},
          "scopeMetrics":[{
            "scope":{"name":"aws.ec2","version":"1.0","epoch":"1768646400"},
            "metrics":[{
              "name":"cpu.utilization","unit":"percent",
              "gauge":{"dataPoints":[{
                "timeUnixNano":"1768646400000000000","asDouble":42.7,
                "attributes":[
                  {"key":"dataSourceInstanceName","value":{"stringValue":"cpu_total"}},
                  {"key":"wildAlias","value":{"stringValue":"CPU Total"}}
                ]
              }]}
            }]
          }]
        }]
      }
```

---

## 9. Security & PII
- No secrets/credentials in events.  
- Avoid PII in attributes; if present, document keys or hash.

---

## 10. Performance & SLO Hints
- For demos: Firehose buffering 1–5 min / 5–32 MB; p50 end‑to‑S3 target < 30s.  
- Tune per environment and query needs.
---