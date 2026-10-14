# Operations runbook

## Local or container page fails to load

1. Check `docker logs little-steps` and request `/healthz`.
2. Confirm host port maps to container port **8080**, not 80.
3. Check `/bundle.js` and `/assets/map0.json` independently. A healthy HTML page is insufficient if scripts or assets are missing.
4. Inspect browser console errors and failed requests. Repeat the Playwright suite against the failing URL using `BASE_URL`.

## Failed quality check

Run the same failing command locally on Node.js 24. Repair the cause and commit the lockfile when dependencies change. Do not disable a check to make the badge green.

## AWS image pull or deployment failure

Check service events, task stop reasons, execution-role permissions, image digest, and egress. A public subnet route alone is insufficient if the task has neither a public IP nor another egress path. A private subnet needs a deliberately configured NAT or endpoint path for image pulls and logs.

## Rollback

Record the stable task definition ARN and image digest before releasing. Restore that version, wait for service stabilization, then verify health, HTML, bundle, and browser behavior. Deployment circuit-breaker rollback requires an earlier completed deployment; it cannot restore a first deployment that never became healthy.

## Cleanup

Destroy only the dedicated experiment's Terraform state. Confirm ECS tasks, ALB, log groups, and experiment networking have been removed. Preserve any pre-existing network lab and IAM resources not owned by this experiment.
