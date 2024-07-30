from __future__ import annotations

import os

from dotenv import load_dotenv

load_dotenv()

SSL_PUBKEY = os.getenv("SSL_PUBKEY")
SSL_PRIVKEY = os.getenv("SSL_PRIVKEY")
DOMAINS = os.getenv("DOMAINS").split(",")
HTTP_PORT = int(os.getenv("HTTP_PORT"))
HTTPS_PORT = int(os.getenv("HTTPS_PORT"))
