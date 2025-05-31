# mindmap

## Docker

To build and start the containers (using your .env file):

```
docker-compose --env-file .env up -d --build
```

To stop and remove all containers, networks, and named volumes:

```
docker-compose --env-file .env down -v
```
