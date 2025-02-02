.PHONY: all backend frontend stop start

all: backend frontend

backend:
	@echo "Starting Go backend server..."
	@if lsof -Pi :8080 -sTCP:LISTEN -t >/dev/null ; then \
		echo "Port 8080 is already in use. Stopping existing process..." ; \
		pkill -f "go run main.go" || true ; \
		sleep 1 ; \
	fi
	@go run main.go &

frontend:
	@echo "Starting frontend server..."
	@if lsof -Pi :5500 -sTCP:LISTEN -t >/dev/null ; then \
		echo "Port 5500 is already in use. Stopping existing process..." ; \
		pkill -f "python3 -m http.server" || true ; \
		sleep 1 ; \
	fi
	@python3 -m http.server 5500 &

stop:
	@echo "Stopping servers..."
	@pkill -f "go run main.go" || true
	@pkill -f "python3 -m http.server" || true
	@sleep 1

start: stop all
	@echo "Servers are running!"
	@echo "Frontend: http://localhost:5500"
	@echo "Backend: http://localhost:8080" 