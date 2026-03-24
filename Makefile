# Local development (Linux/macOS; Python 3.11+ and Node 18+ recommended)
.PHONY: install backend frontend dev

install:
	python3 -m venv .venv
	./.venv/bin/pip install -r requirements.txt
	cd frontend && npm install

backend:
	./.venv/bin/python -m backend.serve --host 127.0.0.1 --port 8000

frontend:
	cd frontend && npm run dev -- --host 127.0.0.1

dev:
	@echo "Single terminal: ./scripts/run-local.sh"
	@echo "Or two terminals: make backend   |   make frontend"
