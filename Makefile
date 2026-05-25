.PHONY: build run clean test

build:
	go build -o chat-settings-checker main.go

run:
	go run main.go

dev:
	go run -race main.go

clean:
	rm -f chat-settings-checker
	go clean

test:
	go test -v ./...

docker-build:
	docker build -t chat-settings-checker:latest .

docker-run:
	docker run -p 3000:3000 --env-file .env chat-settings-checker:latest

deps:
	go mod tidy
	go mod verify
