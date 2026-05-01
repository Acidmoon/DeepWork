## ADDED Requirements

### Requirement: Partition field handles non-string values safely
The `normalizeManagedWebPanelConfig` function SHALL coerce `partition` to a string safely so that `null`, `undefined`, or other non-string values do not cause a runtime TypeError. When the coerced value is empty, the function SHALL fall back to `persist:${config.id}`.

#### Scenario: Null partition falls back to default
- **WHEN** `config.partition` is `null`
- **THEN** the normalized config uses `persist:${config.id}` as the partition value

#### Scenario: Undefined partition falls back to default
- **WHEN** `config.partition` is `undefined`
- **THEN** the normalized config uses `persist:${config.id}` as the partition value

#### Scenario: Valid string partition is preserved
- **WHEN** `config.partition` is a non-empty string like `"persist:custom"`
- **THEN** the normalized config retains `"persist:custom"` as the partition value
