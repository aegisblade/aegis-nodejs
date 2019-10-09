#!/usr/bin/env bash

# A part of the AegisBlade Node.js Client Library
# Copyright (C) 2019 Thornbury Organization, Bryan Thornbury
# This file may be used under the terms of the GNU Lesser General Public License, version 2.1.
# For more details see: https://www.gnu.org/licenses/lgpl-2.1.html

SOURCE="${BASH_SOURCE[0]}"
while [ -h "$SOURCE" ]; do # resolve $SOURCE until the file is no longer a symlink
  DIR="$( cd -P "$( dirname "$SOURCE" )" && pwd )"
  SOURCE="$(readlink "$SOURCE")"
  [[ "$SOURCE" != /* ]] && SOURCE="$DIR/$SOURCE" # if $SOURCE was a relative symlink, we need to resolve it relative to the path where the symlink file was located
done
DIR="$( cd -P "$( dirname "$SOURCE" )" && pwd )"

set -e
set -x

container_name="aegisblade_nodejs_client_docs_generator"
image_name="localhost/$container_name"


rm_dockerfile() {
  echo "cleaning up..."
  rm -f "$DIR/Dockerfile" || true
  docker rm -f $container_name || true
}
trap rm_dockerfile EXIT

cp "$DIR/docs/build/Dockerfile" "$DIR/Dockerfile"
docker build --build-arg "userid=`id -u`" -t $image_name "$DIR"

docker rm -f $container_name || true
docker run --name $container_name $image_name "$@"

docker cp $container_name:/app/out/. "$DIR/dist"
