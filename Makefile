# =============================================================================
# Movie Finder Frontend — Docker-only developer contract
#
# All quality commands run inside a Node.js container — no host Node.js or npm
# required. Docker is the only required runtime.
#
# Usage:
#   make help
#   make <target>
#
# Typical first-time flow:
#   make init        # pull node image + npm ci (installs node_modules)
#   make editor-up   # start long-running dev container (instant exec afterwards)
#   make check       # typecheck + lint + format:check + test
#
# When the dev container is running, quality commands use 'docker compose exec'
# and complete in under 2 seconds. Without a running container they fall back to
# 'docker compose run --rm --no-deps'.
# =============================================================================

.PHONY: help init editor-up editor-down shell logs lint format fix typecheck \
        test test-coverage pre-commit check build clean clean-docker ci-down \
        serve serve-down serve-logs

.DEFAULT_GOAL := help

COMPOSE  ?= docker compose
SERVICE  ?= dev
NPM      := npm
GIT_DIR_HOST  := $(shell git rev-parse --git-dir)
GIT_HOOKS_DIR := $(GIT_DIR_HOST)/hooks

export CLIENT_GIT_DIR := $(GIT_DIR_HOST)

JUNIT_XML     ?= test-results/frontend-results.xml

# ---------------------------------------------------------------------------
# exec when running, run --rm otherwise — avoids container startup overhead
# for interactive development while remaining correct for CI.
# ---------------------------------------------------------------------------
define exec_or_run
	@if $(COMPOSE) ps --services --status running 2>/dev/null | grep -qx "$(SERVICE)"; then \
		$(COMPOSE) exec $(SERVICE) $(1); \
	else \
		$(COMPOSE) run --rm --no-deps $(SERVICE) $(1); \
	fi
endef

help:
	@echo ""
	@echo "Movie Finder Frontend — available targets"
	@echo "========================================="
	@echo ""
	@echo "  Setup"
	@echo "    init           Pull node image, run npm ci, install git hook"
	@echo ""
	@echo "  Editor"
	@echo "    editor-up      Start long-running dev container for instant exec"
	@echo "    editor-down    Stop the dev container"
	@echo "    shell          Open a shell in the dev container"
	@echo ""
	@echo "  Quality"
	@echo "    lint           Run ESLint (report only)"
	@echo "    format         Run Prettier (apply)"
	@echo "    fix            Run ESLint --fix + Prettier (apply all auto-fixes)"
	@echo "    typecheck      Run tsc --noEmit"
	@echo "    test           Run Vitest"
	@echo "    test-coverage  Run Vitest with coverage and JUnit output"
	@echo "    pre-commit     Run all pre-commit hooks"
	@echo "    check          typecheck + lint + format:check + test-coverage"
	@echo "    clean          Remove node_modules, dist, and cache folders"
	@echo "    clean-docker   Stop containers and remove volumes + local images"
	@echo ""
	@echo "  Dev server"
	@echo "    serve          Start Angular dev server — accessible at http://<host-ip>:4200"
	@echo "    serve-down     Stop the Angular dev server"
	@echo "    serve-logs     Follow Angular dev server logs"
	@echo ""
	@echo "  Build"
	@echo "    build          Production Angular build (dist/)"
	@echo "    logs           Follow workspace container logs"
	@echo "    ci-down        Full cleanup: stop container, remove image"
	@echo ""

init:
	$(COMPOSE) build $(SERVICE)
	$(call exec_or_run,npm ci --prefer-offline)
	@printf '#!/bin/sh\nexec make pre-commit\n' > $(GIT_HOOKS_DIR)/pre-commit
	@chmod +x $(GIT_HOOKS_DIR)/pre-commit
	@echo ">>> git pre-commit hook installed (calls 'make pre-commit' on every commit)"

editor-up:
	$(COMPOSE) up -d $(SERVICE)

editor-down:
	$(COMPOSE) down --remove-orphans

ci-down:
	$(COMPOSE) down -v --rmi local --remove-orphans

logs:
	${COMPOSE} logs -f ${SERVICE}

shell:
	@if $(COMPOSE) ps --services --status running 2>/dev/null | grep -qx "$(SERVICE)"; then \
		$(COMPOSE) exec $(SERVICE) bash; \
	else \
		$(COMPOSE) run --rm $(SERVICE) bash; \
	fi

lint:
	$(call exec_or_run,$(NPM) run lint)

format:
	$(call exec_or_run,$(NPM) run format)

fix:
	$(call exec_or_run,$(NPM) run lint:fix)
	$(call exec_or_run,$(NPM) run format)

typecheck:
	$(call exec_or_run,$(NPM) run typecheck)

test:
	$(call exec_or_run,$(NPM) run test:ci)

test-coverage:
	$(call exec_or_run,sh -c 'mkdir -p test-results coverage && chmod 777 test-results coverage')
	$(call exec_or_run,env VITEST_JUNIT_OUTPUT_FILE=$(JUNIT_XML) $(NPM) run test:ci)
	@# Flatten coverage directory to align with backend submodules (performed inside container for permissions).
	$(call exec_or_run,sh -c 'if [ -d coverage/movie-finder-ui ]; then mv coverage/movie-finder-ui/* coverage/ 2>/dev/null || true; rm -rf coverage/movie-finder-ui; fi')
	@# Fix absolute paths in Cobertura report so Jenkins can find the source files.
	$(call exec_or_run,sed -i "s|/workspace|.|g" coverage/cobertura-coverage.xml)

pre-commit:
	$(call exec_or_run,pre-commit run --all-files)

check: typecheck lint test-coverage

build:
	$(call exec_or_run,npx ng build --configuration=production)

clean:
	@echo ">>> Removing frontend cache and generated files..."
	$(call exec_or_run,rm -rf node_modules .angular dist coverage test-results)
	@echo "Clean complete."

clean-docker: ci-down

serve:
	$(COMPOSE) up -d serve
	@echo ""
	@echo ">>> Angular dev server starting..."
	@echo ">>> Access locally:    http://localhost:4200"
	@echo ">>> Access on network: http://<this-host-ip>:4200"
	@echo ">>> Logs: make serve-logs"
	@echo ""

serve-down:
	$(COMPOSE) stop serve
	$(COMPOSE) rm -f serve

serve-logs:
	$(COMPOSE) logs -f serve
