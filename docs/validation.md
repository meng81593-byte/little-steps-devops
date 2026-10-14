# Validation and limitations

Review date: 14 October 2026.

Local verified results during this update:

- Node.js 24.12.0; TypeScript type check passed.
- ESLint with TypeScript rules passed after addressing unchecked casts and unused code.
- Twelve unit/regression tests passed, including all four shipped level definitions.
- Production Webpack build passed.
- `npm audit` reported zero vulnerabilities after removing the proxy-based development server and updating dependencies. This is a point-in-time dependency audit, not a guarantee of future vulnerability status.

Browser, container, cloud deployment, rollback, and cleanup evidence will be added after those steps actually run. GitHub Actions defines the container checks; configuration alone does not establish a passing run.

## Budget regression examples

Two paths requiring `(time=1, stamina=10)` and `(time=10, stamina=1)` must retain both budgets. `(1,1)` is not a valid winning budget. Defender nodes require a budget sufficient for every outgoing choice. Unreachable goals remain unreachable even with positive resource cycles. Goal feedback requires both a reached goal and a bone.

The solver uses graph reachability rather than a complete simulation of interactive traps and cat decisions. It returns a convergence flag; no exact mathematical claim should be made for a graph that hits the iteration guard.
