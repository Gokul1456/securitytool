"""
scanner.py – Enhanced Web Application Security Scanner
=======================================================
Features:
  • SQL Injection, XSS, Command Injection, Path Traversal,
    SSRF, Auth Bypass – payload fuzzing across all endpoints
  • HTTP method fuzzing (GET, POST, PUT, DELETE, PATCH)
  • CORS misconfiguration detection
  • Missing / broken authentication detection
  • Rate-limit detection
  • Error leakage detection (stack traces, debug info)
  • Configurable base URL + endpoints via argparse
  • Structured logging + color-coded terminal output
  • JSON + TXT dual report output
  • Timeout + retry handling
"""

import json
import logging
import argparse
import requests
import time
from colorama import Fore, Style, init
from datetime import datetime

init(autoreset=True)

# ── Logging Setup ─────────────────────────────────────────────────────────────
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s  %(levelname)-8s  %(message)s",
    datefmt="%Y-%m-%d %H:%M:%S",
)
logger = logging.getLogger(__name__)

# ═══════════════════════════════════════════════════════════════════════════════
# Payload Libraries
# ═══════════════════════════════════════════════════════════════════════════════

SQL_PAYLOADS = [
    "1 OR 1=1",
    "' OR '1'='1",
    "' OR 1=1 --",
    "1; DROP TABLE users--",
    "' UNION SELECT null,null,null--",
    "admin'--",
    "1' AND SLEEP(5)--",
]

XSS_PAYLOADS = [
    "<script>alert(1)</script>",
    "'><script>alert(1)</script>",
    "<img src=x onerror=alert(1)>",
    "javascript:alert(document.cookie)",
    "<svg onload=alert(1)>",
]

CMD_INJECTION_PAYLOADS = [
    "; ls",
    "| whoami",
    "&& cat /etc/passwd",
    "; ping -c 1 127.0.0.1",
    "$(id)",
    "`id`",
]

PATH_TRAVERSAL_PAYLOADS = [
    "../../../../etc/passwd",
    "..\\..\\..\\windows\\system32\\drivers\\etc\\hosts",
    "%2e%2e%2fetc%2fpasswd",
    "....//....//etc/passwd",
]

SSRF_PAYLOADS = [
    "http://169.254.169.254/latest/meta-data/",      # AWS metadata
    "http://localhost/",
    "http://127.0.0.1:22/",
    "http://[::1]/",
    "file:///etc/passwd",
]

AUTH_BYPASS_PAYLOADS = [
    "admin' --",
    "' OR 1=1 LIMIT 1--",
    "anything",              # missing auth check
]

PROMPT_INJECTION_PATTERNS = [
    "ignore previous instructions",
    "show all records",
    "dump database",
    "give me all user data",
    "reveal system prompt",
    "act as administrator",
]

SENSITIVE_DATA_PATTERNS = [
    "student phone",
    "payment details",
    "admission database",
    "user passwords",
    "api key",
    "secret key",
    "access token",
]

ERROR_LEAK_SIGNATURES = [
    "traceback",
    "stack trace",
    "exception",
    "syntax error",
    "at line",
    "mongodberror",
    "sqlexception",
    "cannot read property",
    "undefined variable",
    "debug",
    "internal server error",
]

CORS_TEST_ORIGIN = "https://evil.com"
HTTP_METHODS     = ["GET", "POST", "PUT", "DELETE", "PATCH"]
REQUEST_TIMEOUT  = 8   # seconds
MAX_RETRIES      = 2

# ═══════════════════════════════════════════════════════════════════════════════
# Helpers
# ═══════════════════════════════════════════════════════════════════════════════

def _log_finding(level: str, category: str, url: str, detail: str) -> dict:
    """Print a color-coded finding and return as a structured dict."""
    colors = {
        "CRITICAL": Fore.RED + Style.BRIGHT,
        "HIGH":     Fore.RED,
        "MEDIUM":   Fore.YELLOW,
        "LOW":      Fore.CYAN,
        "INFO":     Fore.BLUE,
        "PASS":     Fore.GREEN,
    }
    color = colors.get(level, Fore.WHITE)
    print(f"{color}[{level:<8}] [{category}]  {url}\n          {detail}")
    return {
        "level":    level,
        "category": category,
        "url":      url,
        "detail":   detail,
        "time":     datetime.now().isoformat(),
    }


def _request(method: str, url: str, **kwargs) -> requests.Response | None:
    """Send an HTTP request with timeout and retry."""
    kwargs.setdefault("timeout", REQUEST_TIMEOUT)
    kwargs.setdefault("allow_redirects", False)

    for attempt in range(1, MAX_RETRIES + 1):
        try:
            return requests.request(method, url, **kwargs)
        except requests.exceptions.ConnectionError:
            if attempt == MAX_RETRIES:
                return None
            time.sleep(0.5)
        except requests.exceptions.Timeout:
            logger.warning("Timeout on %s %s (attempt %d)", method, url, attempt)
            if attempt == MAX_RETRIES:
                return None
        except requests.exceptions.RequestException as e:
            logger.error("Request error: %s", e)
            return None
    return None


def _check_error_leakage(response: requests.Response, url: str) -> list[dict]:
    """Check if the response body leaks internal error information."""
    findings = []
    body = response.text.lower()
    for sig in ERROR_LEAK_SIGNATURES:
        if sig in body:
            findings.append(_log_finding(
                "MEDIUM", "Error Leakage", url,
                f"Response contains '{sig}' – may reveal internal stack/debug info"
            ))
            break
    return findings


# ═══════════════════════════════════════════════════════════════════════════════
# Security Tests
# ═══════════════════════════════════════════════════════════════════════════════

def test_sql_injection(base_url: str, endpoints: list[str]) -> list[dict]:
    findings = []
    print(Fore.CYAN + "\n[SQL Injection Tests]")
    
    for ep in endpoints:
        url = base_url + ep
        
        # ── Step 1: Establish Time Baseline ──
        baseline_resp = _request("GET", url, params={"id": "baseline"})
        if baseline_resp is None:
            _log_finding("INFO", "SQL Inject", url, "Endpoint not reachable for baseline")
            continue
            
        baseline_time = baseline_resp.elapsed.total_seconds()
        logger.debug("Baseline time for %s: %.3fs", ep, baseline_time)

        # ── Step 2: Payloaded Requests ──
        for payload in SQL_PAYLOADS:
            r = _request("GET", url, params={"id": payload})
            if r is None:
                break
            
            resp_time = r.elapsed.total_seconds()
            
            # Logic: If payload causes 500 or significant delay (> Baseline + 3s)
            if r.status_code == 500:
                findings.append(_log_finding(
                    "CRITICAL", "SQL Injection", url,
                    f"500 response triggered by payload: {payload!r}"
                ))
            elif resp_time > (baseline_time + 3.0):
                findings.append(_log_finding(
                    "HIGH", "SQL Blind (Timing Analysis)", url,
                    f"Significant delay detected! Baseline: {baseline_time:.2f}s | payload: {resp_time:.2f}s | Type: Potential Time-Based Blind SQLi"
                ))
            else:
                _log_finding("PASS", "SQL Inject", url, f"Resisted payload: {payload!r}")
                
            findings += _check_error_leakage(r, url)
    return findings


def test_xss(base_url: str, endpoints: list[str]) -> list[dict]:
    findings = []
    print(Fore.CYAN + "\n[XSS Tests]")
    for ep in endpoints:
        url = base_url + ep
        for payload in XSS_PAYLOADS:
            r = _request("GET", url, params={"input": payload})
            if r is None:
                break
            if payload in r.text:
                findings.append(_log_finding(
                    "HIGH", "XSS", url,
                    f"Payload reflected in response: {payload!r}"
                ))
            else:
                _log_finding("PASS", "XSS", url, f"Not reflected: {payload!r}")
    return findings


def test_command_injection(base_url: str, endpoints: list[str]) -> list[dict]:
    findings = []
    print(Fore.CYAN + "\n[Command Injection Tests]")
    for ep in endpoints:
        url = base_url + ep
        for payload in CMD_INJECTION_PAYLOADS:
            for param in ["cmd", "exec", "command", "input", "query"]:
                r = _request("GET", url, params={param: payload})
                if r is None:
                    break
                suspicious = any(sig in r.text.lower() for sig in
                                  ["root:", "/bin/", "uid=", "volume"])
                if suspicious:
                    findings.append(_log_finding(
                        "CRITICAL", "Cmd Injection", url,
                        f"OS output detected with payload {payload!r} via param '{param}'"
                    ))
    return findings


def test_path_traversal(base_url: str, endpoints: list[str]) -> list[dict]:
    findings = []
    print(Fore.CYAN + "\n[Path Traversal Tests]")
    for ep in endpoints:
        url = base_url + ep
        for payload in PATH_TRAVERSAL_PAYLOADS:
            for param in ["file", "path", "page", "doc"]:
                r = _request("GET", url, params={param: payload})
                if r is None:
                    break
                if any(sig in r.text for sig in ["root:x:0:", "[drivers]", "localhost"]):
                    findings.append(_log_finding(
                        "CRITICAL", "Path Traversal", url,
                        f"Sensitive file content found with payload {payload!r}"
                    ))
    return findings


def test_ssrf(base_url: str, endpoints: list[str]) -> list[dict]:
    findings = []
    print(Fore.CYAN + "\n[SSRF Tests]")
    for ep in endpoints:
        url = base_url + ep
        for payload in SSRF_PAYLOADS:
            r = _request("GET", url, params={"url": payload})
            if r is None:
                break
            if r.status_code == 200 and len(r.text) > 50:
                findings.append(_log_finding(
                    "HIGH", "SSRF", url,
                    f"Possible SSRF: 200 response fetching internal URL {payload!r}"
                ))
    return findings


def test_auth_bypass(base_url: str, endpoints: list[str]) -> list[dict]:
    """
    Check for missing authentication and auth bypass payloads.
    """
    findings = []
    print(Fore.CYAN + "\n[Auth / Broken Auth Tests]")
    for ep in endpoints:
        url = base_url + ep
        # Unauthenticated access
        r = _request("GET", url)
        if r is None:
            continue
        if r.status_code == 200:
            findings.append(_log_finding(
                "MEDIUM", "Missing Auth", url,
                "Endpoint returned 200 with no credentials — verify auth is enforced"
            ))
        # Auth bypass payloads
        for payload in AUTH_BYPASS_PAYLOADS:
            r2 = _request("POST", url, json={"username": payload, "password": payload})
            if r2 and r2.status_code == 200:
                findings.append(_log_finding(
                    "HIGH", "Auth Bypass", url,
                    f"Possible auth bypass with payload: {payload!r}"
                ))
    return findings


def test_cors(base_url: str, endpoints: list[str]) -> list[dict]:
    """Check if the server reflects arbitrary Origin headers (CORS misconfiguration)."""
    findings = []
    print(Fore.CYAN + "\n[CORS Tests]")
    for ep in endpoints:
        url = base_url + ep
        r = _request("OPTIONS", url, headers={"Origin": CORS_TEST_ORIGIN})
        if r is None:
            continue
        acao = r.headers.get("Access-Control-Allow-Origin", "")
        acac = r.headers.get("Access-Control-Allow-Credentials", "")
        if acao == CORS_TEST_ORIGIN:
            level = "CRITICAL" if acac.lower() == "true" else "HIGH"
            findings.append(_log_finding(
                level, "CORS Misconfiguration", url,
                f"Reflects evil origin '{CORS_TEST_ORIGIN}' "
                f"  Allow-Credentials: {acac or 'not set'}"
            ))
        elif acao == "*":
            findings.append(_log_finding(
                "MEDIUM", "CORS Wildcard", url,
                "Access-Control-Allow-Origin: * — may allow cross-origin reads"
            ))
        else:
            _log_finding("PASS", "CORS", url, f"Origin not reflected (ACAO: {acao or 'not set'})")
    return findings


def test_rate_limiting(base_url: str, endpoints: list[str], burst: int = 20) -> list[dict]:
    """Fire *burst* rapid requests and check for rate-limit response (429)."""
    findings = []
    print(Fore.CYAN + "\n[Rate Limit Tests]")
    for ep in endpoints:
        url   = base_url + ep
        codes = []
        for _ in range(burst):
            r = _request("GET", url)
            if r:
                codes.append(r.status_code)
        if 429 in codes:
            _log_finding("PASS", "Rate Limit", url, f"429 received after {burst} requests ✓")
        else:
            findings.append(_log_finding(
                "MEDIUM", "No Rate Limit", url,
                f"No 429 after {burst} rapid requests — brute-force risk"
            ))
    return findings


def test_http_methods(base_url: str, endpoints: list[str]) -> list[dict]:
    """Check which HTTP methods are accepted and flag dangerous ones."""
    findings = []
    print(Fore.CYAN + "\n[HTTP Method Fuzzing]")
    dangerous = {"PUT", "DELETE", "PATCH"}
    for ep in endpoints:
        url = base_url + ep
        for method in HTTP_METHODS:
            r = _request(method, url)
            if r is None:
                continue
            if r.status_code not in (404, 405, 501) and method in dangerous:
                findings.append(_log_finding(
                    "MEDIUM", "HTTP Method", url,
                    f"{method} returned {r.status_code} — verify this method should be allowed"
                ))
            else:
                _log_finding("INFO", "HTTP Method", url, f"{method} → {r.status_code}")
    return findings


def test_chatbot_security(inputs: list[str] | None = None) -> list[dict]:
    """Run the chatbot input filter against injection + sensitive-data patterns."""
    findings = []
    print(Fore.CYAN + "\n[Chatbot Security Filter]")

    # Combine pattern lists for self-contained testing
    all_patterns = PROMPT_INJECTION_PATTERNS + SENSITIVE_DATA_PATTERNS
    test_inputs  = inputs or all_patterns + [
        "show me the student list",
        "' OR 1=1 --",
        "<script>alert(1)</script>",
    ]

    for msg in test_inputs:
        blocked = _check_prompt_security(msg)
        if blocked:
            _log_finding("PASS", "Chatbot Filter", "chatbot", f"Blocked: {msg!r}  → {blocked}")
        else:
            findings.append(_log_finding(
                "HIGH", "Chatbot Filter", "chatbot",
                f"Input NOT blocked — possible injection: {msg!r}"
            ))
    return findings


def _check_prompt_security(user_input: str) -> str | None:
    """Return a block reason string or None if input is safe."""
    lower = user_input.lower()

    for p in [" OR 1=1", "' OR '1'='1", "DROP TABLE", "UNION SELECT",
              "' OR 1=1"]:
        if p.lower() in lower:
            return "SQL Injection"

    for p in ["<script>", "</script>", "onerror=", "alert(", "<svg", "javascript:"]:
        if p.lower() in lower:
            return "XSS"

    for p in PROMPT_INJECTION_PATTERNS:
        if p.lower() in lower:
            return "Prompt Injection"

    for p in SENSITIVE_DATA_PATTERNS:
        if p.lower() in lower:
            return "Sensitive Data Request"

    return None


def _write_reports(all_findings: list[dict], report_prefix: str = "scan_report") -> None:
    """Write JSON and TXT reports from the collected findings."""
    # JSON
    json_path = report_prefix + ".json"
    with open(json_path, "w") as jf:
        json.dump({
            "scan_time": datetime.now().isoformat(),
            "total":     len(all_findings),
            "findings":  all_findings,
        }, jf, indent=2)
    logger.info("JSON report → %s", json_path)

    # TXT
    txt_path = report_prefix + ".txt"
    counts   = {}
    for f in all_findings:
        counts[f["level"]] = counts.get(f["level"], 0) + 1

    with open(txt_path, "w") as tf:
        tf.write(f"Security Scan Report  [{datetime.now().isoformat()}]\n")
        tf.write("=" * 65 + "\n\n")

        tf.write("SUMMARY\n")
        tf.write("-" * 30 + "\n")
        for level in ["CRITICAL", "HIGH", "MEDIUM", "LOW", "INFO", "PASS"]:
            tf.write(f"  {level:<10}: {counts.get(level, 0)}\n")
        tf.write("\n")

        tf.write("FINDINGS\n")
        tf.write("-" * 30 + "\n")
        for f in all_findings:
            tf.write(
                f"[{f['level']:<8}] [{f['category']}]\n"
                f"  URL   : {f['url']}\n"
                f"  Detail: {f['detail']}\n"
                f"  Time  : {f['time']}\n\n"
            )

    logger.info("TXT  report → %s", txt_path)


def _print_summary(findings: list[dict]) -> None:
    """Print a color-coded summary table to the terminal."""
    counts: dict[str, int] = {}
    for f in findings:
        counts[f["level"]] = counts.get(f["level"], 0) + 1

    color_map = {
        "CRITICAL": Fore.RED + Style.BRIGHT,
        "HIGH":     Fore.RED,
        "MEDIUM":   Fore.YELLOW,
        "LOW":      Fore.CYAN,
        "PASS":     Fore.GREEN,
        "INFO":     Fore.BLUE,
    }

    print(Fore.CYAN + Style.BRIGHT + "\n" + "═" * 50)
    print(Fore.CYAN + Style.BRIGHT + "  SECURITY SCAN SUMMARY")
    print(Fore.CYAN + Style.BRIGHT + "═" * 50)
    for level in ["CRITICAL", "HIGH", "MEDIUM", "LOW", "INFO", "PASS"]:
        n = counts.get(level, 0)
        print(f"  {color_map[level]}{level:<10}{Style.RESET_ALL}  {n}")
    total_issues = sum(v for k, v in counts.items() if k != "PASS")
    print(Fore.CYAN + "─" * 50)
    print(f"  Total issues : {total_issues}")
    print(f"  Total checks : {len(findings)}")
    print(Fore.CYAN + "═" * 50 + "\n")


# CLI entry point


def _parse_args() -> argparse.Namespace:
    p = argparse.ArgumentParser(description="Web Application Security Scanner")
    p.add_argument("--url",     default="http://localhost:3000",
                   help="Base URL to scan (default: http://localhost:3000)")
    p.add_argument("--report",  default="scan_report",
                   help="Report file prefix (default: scan_report)")
    p.add_argument("--burst",   type=int, default=20,
                   help="Requests to fire for rate-limit test (default: 20)")
    p.add_argument("--verbose", action="store_true", help="Enable DEBUG logging")
    p.add_argument("--skip",    nargs="*", default=[],
                   choices=["sql","xss","cmd","path","ssrf","auth",
                            "cors","rate","methods","chatbot"],
                   help="Skip specific test modules")
    return p.parse_args()


if __name__ == "__main__":
    args = _parse_args()

    if args.verbose:
        logging.getLogger().setLevel(logging.DEBUG)

    BASE_URL  = args.url
    ENDPOINTS = [
        "/api/student",
        "/api/login",
        "/api/leads",
        "/api/payment",
        "/api/user",
        "/api/admin",
        "/api/files",
    ]
    SKIP = set(args.skip)

    print(Fore.CYAN + Style.BRIGHT + f"\n{'═'*55}")
    print(Fore.CYAN + Style.BRIGHT + f"  Security Scanner  →  {BASE_URL}")
    print(Fore.CYAN + Style.BRIGHT + f"{'═'*55}\n")

    all_findings: list[dict] = []

    if "sql"     not in SKIP: all_findings += test_sql_injection(BASE_URL, ENDPOINTS)
    if "xss"     not in SKIP: all_findings += test_xss(BASE_URL, ENDPOINTS)
    if "cmd"     not in SKIP: all_findings += test_command_injection(BASE_URL, ENDPOINTS)
    if "path"    not in SKIP: all_findings += test_path_traversal(BASE_URL, ENDPOINTS)
    if "ssrf"    not in SKIP: all_findings += test_ssrf(BASE_URL, ENDPOINTS)
    if "auth"    not in SKIP: all_findings += test_auth_bypass(BASE_URL, ENDPOINTS)
    if "cors"    not in SKIP: all_findings += test_cors(BASE_URL, ENDPOINTS)
    if "rate"    not in SKIP: all_findings += test_rate_limiting(BASE_URL, ENDPOINTS, args.burst)
    if "methods" not in SKIP: all_findings += test_http_methods(BASE_URL, ENDPOINTS)
    if "chatbot" not in SKIP: all_findings += test_chatbot_security()

    _print_summary(all_findings)
    _write_reports(all_findings, args.report)