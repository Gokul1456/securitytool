import os
import uuid
from pathlib import Path

from flask import Flask, flash, redirect, render_template, request, url_for
from werkzeug.utils import secure_filename

from malware_scanner import MAX_FILE_SIZE_MB, scan_file


BASE_DIR = Path(__file__).resolve().parent
UPLOAD_DIR = BASE_DIR / "uploads"
QUARANTINE_DIR = BASE_DIR / "quarantine"


def create_app() -> Flask:
    app = Flask(__name__)
    app.secret_key = os.getenv("APP_SECRET_KEY", "dev-only-change-me")
    app.config["MAX_CONTENT_LENGTH"] = MAX_FILE_SIZE_MB * 1024 * 1024

    UPLOAD_DIR.mkdir(parents=True, exist_ok=True)

    @app.get("/")
    def index():
        return render_template("upload.html", max_size_mb=MAX_FILE_SIZE_MB)

    @app.post("/upload")
    def upload():
        f = request.files.get("file")
        if f is None or not f.filename:
            flash("Choose a file to upload.", "error")
            return redirect(url_for("index"))

        original_name = f.filename
        safe_name = secure_filename(original_name)
        if not safe_name:
            flash("Unsupported filename.", "error")
            return redirect(url_for("index"))

        stored_name = f"{uuid.uuid4().hex}_{safe_name}"
        dest_path = UPLOAD_DIR / stored_name
        f.save(dest_path)

        result = scan_file(
            str(dest_path),
            upload_folder=str(UPLOAD_DIR),
            quarantine_dir=str(QUARANTINE_DIR),
            max_size_mb=MAX_FILE_SIZE_MB,
        )

        status = result.get("status")
        if status == "INFECTED":
            flash("Upload rejected: malware detected. File moved to quarantine.", "error")
        elif status == "CLEAN":
            flash("Upload accepted: file appears clean.", "success")
        elif status == "SKIPPED_TOO_LARGE":
            flash(f"Upload rejected: file exceeds {MAX_FILE_SIZE_MB} MB limit.", "error")
        else:
            flash(f"Upload failed: {status or 'ERROR'}", "error")

        return render_template("result.html", original_name=original_name, result=result)

    return app


app = create_app()


if __name__ == "__main__":
    debug = os.getenv("FLASK_DEBUG", "").strip() in {"1", "true", "True", "yes"}
    app.run(
        host="0.0.0.0",
        port=int(os.getenv("PORT", "5000")),
        debug=debug,
        use_reloader=debug,
    )

