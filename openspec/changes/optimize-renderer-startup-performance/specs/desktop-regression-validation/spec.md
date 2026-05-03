## ADDED Requirements

### Requirement: Track renderer startup performance guardrails
The repository SHALL provide repeatable guidance or checks that make renderer startup optimizations measurable rather than anecdotal.

#### Scenario: Revalidate startup optimization work
- **WHEN** developers change renderer loading boundaries or bundle structure
- **THEN** they can rerun a documented measurement or guardrail flow for startup performance
- **THEN** the repo can detect regressions in the protected startup baseline
