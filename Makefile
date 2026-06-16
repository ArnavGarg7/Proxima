up:
	docker-compose up -d

down:
	docker-compose down

migrate:
	docker-compose exec backend alembic revision --autogenerate -m "initial_schema" || echo "Initial schema may already exist"
	docker-compose exec backend alembic upgrade head

test:
	docker-compose exec backend pytest
	cd frontend && npm run test

lint:
	cd frontend && npm run lint
	cd backend && flake8 proxima tests

format:
	cd frontend && npm run format
	cd backend && black proxima tests
