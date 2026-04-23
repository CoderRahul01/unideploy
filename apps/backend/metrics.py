from prometheus_client import Counter, Histogram, Gauge, make_asgi_app
from functools import wraps
import time

# Metrics definitions
DEPLOYMENTS_TOTAL = Counter(
    "unideploy_deployments_total",
    "Total number of deployments",
    ["status", "tier"]
)

DEPLOYMENT_DURATION = Histogram(
    "unideploy_deployment_duration_seconds",
    "Total time taken for deployment",
    ["tier"]
)

SANDBOXES_ACTIVE = Gauge(
    "unideploy_sandboxes_active_total",
    "Total number of active E2B sandboxes"
)

HTTP_REQUEST_DURATION = Histogram(
    "unideploy_http_request_duration_seconds",
    "HTTP request latency",
    ["method", "endpoint"]
)

# Helper to track deployment success/failure
def track_deployment(status, tier):
    DEPLOYMENTS_TOTAL.labels(status=status, tier=tier).inc()

# Metrics endpoint as ASGI app
metrics_app = make_asgi_app()
