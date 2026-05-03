.PHONY: up down logs ps build shell-api shell-db

up:
	docker compose up -d --build

down:
	docker compose down

logs:
	docker compose logs -f

ps:
	docker compose ps

build:
	docker compose build --no-cache

shell-api:
	docker compose exec api bash

shell-db:
	docker compose exec postgres psql -U athara -d athara
