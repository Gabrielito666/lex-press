#!/bin/bash

IMAGE_NAME="my-node-app"
CONTAINER_NAME="my-node-container"
HOST_PORT=3000
CONTAINER_PORT=3000

VOLUME_PATH=$(pwd)/app/volumes

mkdir -p $VOLUME_PATH

docker run -d --name $CONTAINER_NAME -p $HOST_PORT:$CONTAINER_PORT -v $VOLUME_PATH:/app/volumes $IMAGE_NAME