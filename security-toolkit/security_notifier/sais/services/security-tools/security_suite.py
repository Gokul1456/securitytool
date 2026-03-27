"""
security_suite.py – Run file malware scan + web/API security scan together.

Usage examples:

    # Default: scan uploads/ for malware + http://localhost:3000 for web vulns
    python security_suite.py

    # Custom target URL and uploads folder
    python security_suite.py --url http://myapp.local --uploads uploads
"""

from __future__ import annotations

import argparse
import logging
from datetime import datetime
from typing import Any

from malware_scanner import (
    DEFAULT_QUARANTINE_DIR,
    DEFAULT_UPLOAD_FOLDER,
    MAX_FILE_SIZE_MB,
    scan_uploads,
)
import scanner as webscanner


logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s  %(levelname)-8s  %(message)s",
    datefmt="%Y-%m-%d %H:%M:%S",
)
logger = logging.getLogger(__name__)


DEFAULT_WEB_URL = "http://localhost:3000"
DEFAULT_REPORT_PREFIX = "suite_report"

# Mirror scanner.py default endpoints
DEFAULT_ENDPOINTS = [
    "/api/student",
    "/api/login",
    "/api/leads",
    "/api/payment",
    "/api/user",
    "/api/admin",
    "/api/files",
]


def _parse_args() -> argparse.Namespace:
    p = argparse.ArgumentParser(
        description="Run both malware file scan and web/API security scan.",
    )
    p.add_argument(
        "--uploads",
        default=DEFAULT_UPLOAD_FOLDER,
        help=f"Folder to scan for uploaded files (default: {DEFAULT_UPLOAD_FOLDER})",
    )
    p.add_argument(
        "--quarantine",
        default=DEFAULT_QUARANTINE_DIR,
        help=f"Quarantine directory (default: {DEFAULT_QUARANTINE_DIR})",
    )
    p.add_argument(
        "--url",
        default=DEFAULT_WEB_URL,
        help=f"Base URL to scan for web vulns (default: {DEFAULT_WEB_URL})",
    )
    p.add_argument(
        "--report",
        default=DEFAULT_REPORT_PREFIX,
        help=f"Report file prefix (default: {DEFAULT_REPORT_PREFIX})",
    )
    p.add_argument(
        "--burst",
        type=int,
        default=20,
        help="Requests to fire for rate-limit test (default: 20)",
    )
    p.add_argument(
        "--skip-web",
        nargs="*",
        default=[],
        choices=[
            "sql",
            "xss",
            "cmd",
            "path",
            "ssrf",
            "auth",
            "cors",
            "rate",
            "methods",
            "chatbot",
        ],
        help="Skip specific web scanner modules.",
    )
    p.add_argument(
        "--no-files",
        action="store_true",
        help="Skip malware file scan and only run web scanner.",
    )
    p.add_argument(
        "--no-web",
        action="store_true",
        help="Skip web scanner and only run malware file scan.",
    )
    p.add_argument(
        "--verbose",
        action="store_true",
        help="Enable DEBUG logging.",
    )
    return p.parse_args()


def _write_suite_report(
    report_prefix: str,
    file_results: list[dict[str, Any]] | None,
    web_findings: list[dict[str, Any]] | None,
) -> None:
    """Write a single JSON report that references both scans."""
    import json  # local import to keep top-level small

    path = report_prefix + ".json"
    payload: dict[str, Any] = {
        "generated_at": datetime.now().isoformat(),
        "file_scan": {
            "enabled": file_results is not None,
            "total": len(file_results or []),
            "results": file_results or [],
        },
        "web_scan": {
            "enabled": web_findings is not None,
            "total": len(web_findings or []),
            "findings": web_findings or [],
        },
    }
    with open(path, "w") as f:
        json.dump(payload, f, indent=2)
    logger.info("Suite JSON report → %s", path)


def main() -> None:
    args = _parse_args()
    if args.verbose:
        logging.getLogger().setLevel(logging.DEBUG)

    logger.info("═══ Security Suite Started ═══")

    file_results: list[dict[str, Any]] | None = None
    web_findings: list[dict[str, Any]] | None = None

    # ── 1. Malware scan over uploads/ ────────────────────────────────────────
    if not args.no_files:
        logger.info(
            "Starting malware scan: folder=%s quarantine=%s max_size_mb=%s",
            args.uploads,
            args.quarantine,
            MAX_FILE_SIZE_MB,
        )
        file_results = scan_uploads(
            folder=args.uploads,
            quarantine_dir=args.quarantine,
            report_path=args.report + "_files",
            max_size_mb=MAX_FILE_SIZE_MB,
        )
        logger.info(
            "Malware scan complete. Individual report prefix: %s_files",
            args.report,
        )

    # ── 2. Web/API security scan ─────────────────────────────────────────────
    if not args.no_web:
        base_url = args.url
        endpoints = DEFAULT_ENDPOINTS
        skip = set(args.skip_web)

        logger.info("Starting web scan: base_url=%s", base_url)
        all_f: list[dict[str, Any]] = []

        if "sql" not in skip:
            all_f += webscanner.test_sql_injection(base_url, endpoints)
        if "xss" not in skip:
            all_f += webscanner.test_xss(base_url, endpoints)
        if "cmd" not in skip:
            all_f += webscanner.test_command_injection(base_url, endpoints)
        if "path" not in skip:
            all_f += webscanner.test_path_traversal(base_url, endpoints)
        if "ssrf" not in skip:
            all_f += webscanner.test_ssrf(base_url, endpoints)
        if "auth" not in skip:
            all_f += webscanner.test_auth_bypass(base_url, endpoints)
        if "cors" not in skip:
            all_f += webscanner.test_cors(base_url, endpoints)
        if "rate" not in skip:
            all_f += webscanner.test_rate_limiting(base_url, endpoints, args.burst)
        if "methods" not in skip:
            all_f += webscanner.test_http_methods(base_url, endpoints)
        if "chatbot" not in skip:
            all_f += webscanner.test_chatbot_security()

        web_findings = all_f

        # Re-use scanner.py's summary + report writer for the web portion
        webscanner._print_summary(all_f)  # type: ignore[attr-defined]
        webscanner._write_reports(all_f, args.report + "_web")  # type: ignore[attr-defined]
        logger.info(
            "Web scan complete. Individual report prefix: %s_web",
            args.report,
        )

    # ── 3. Combined suite JSON report ────────────────────────────────────────
    _write_suite_report(args.report + "_suite", file_results, web_findings)

    logger.info("═══ Security Suite Finished ═══")


if __name__ == "__main__":
    main()

