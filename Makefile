# ABOUTME: Makefile for LM Data Publisher MSK Pipeline project
# ABOUTME: Provides convenience targets for setup, testing, deployment, and cleanup

.PHONY: help setup lint test test-python test-infra synth deploy destroy clean

# Default target
help:
	@echo "LM Data Publisher MSK Pipeline - Available targets:"
	@echo ""
	@echo "  setup        - Install all dependencies (Python + Node)"
	@echo "  lint         - Run linters (black, ruff, eslint, prettier)"
	@echo "  test         - Run all tests (Python + CDK)"
	@echo "  test-python  - Run Python tests only"
	@echo "  test-infra   - Run CDK infrastructure tests only"
	@echo "  synth        - Synthesize CDK stacks"
	@echo "  deploy       - Deploy CDK stacks to AWS"
	@echo "  destroy      - Destroy CDK stacks from AWS"
	@echo "  clean        - Remove build artifacts and caches"
	@echo ""

# Install all dependencies
setup:
	@echo "==> Installing Python dependencies with uv..."
	uv sync --locked
	@echo "==> Installing Node dependencies..."
	npm install
	@echo "==> Setup complete!"

# Lint all code
lint:
	@echo "==> Running Python linters..."
	uv run black --check lambda tests
	uv run ruff check lambda tests
	@echo "==> Running TypeScript linters..."
	npm run lint
	@echo "==> Linting complete!"

# Format code
format:
	@echo "==> Formatting Python code..."
	uv run black lambda tests
	uv run ruff check --fix lambda tests
	@echo "==> Formatting TypeScript code..."
	npm run format
	@echo "==> Formatting complete!"

# Run all tests
test: test-python test-infra

# Run Python tests
test-python:
	@echo "==> Running Python tests..."
	uv run pytest -q

# Run CDK infrastructure tests
test-infra:
	@echo "==> Running CDK infrastructure tests..."
	npm test

# Synthesize CDK stacks
synth:
	@echo "==> Synthesizing CDK stacks..."
	npm run build
	npm run synth

# Deploy CDK stacks
deploy:
	@echo "==> Deploying CDK stacks..."
	npm run build
	npm run deploy

# Destroy CDK stacks
destroy:
	@echo "==> WARNING: This will destroy all CDK stacks!"
	@echo "==> Press Ctrl+C to cancel, or wait 5 seconds to continue..."
	@sleep 5
	npx cdk destroy --all

# Clean build artifacts
clean:
	@echo "==> Cleaning build artifacts..."
	rm -rf dist/
	rm -rf cdk.out/
	rm -rf .venv/
	rm -rf node_modules/
	rm -rf .pytest_cache/
	rm -rf .ruff_cache/
	rm -rf coverage/
	rm -rf .jest-localstorage
	find . -type d -name __pycache__ -exec rm -rf {} + 2>/dev/null || true
	find . -type f -name "*.pyc" -delete 2>/dev/null || true
	@echo "==> Clean complete!"
