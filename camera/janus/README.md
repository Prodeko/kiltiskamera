# Kuvan rakennus

1. tässä hakemistossa aja git clone https://github.com/meetecho/janus-gateway.git
2. cp ./Dockerfile janus-gateway/Dockerfile && cp ./docker-compose.yaml janus-gateway/docker-compose.yaml
3. cd janus-gateway
4. docker build -t kiltiskamera/janus .
5. docker compose up
