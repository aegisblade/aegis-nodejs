#!/usr/bin/env bash

# A part of the AegisBlade Node.js Client Library
# Copyright (C) 2019 Thornbury Organization, Bryan Thornbury
# This file may be used under the terms of the GNU Lesser General Public License, version 2.1.
# For more details see: https://www.gnu.org/licenses/lgpl-2.1.html

# Version
VERSION=`node -e 'process.stdout.write(require("./package.json").version)'`

mkdir -p ./out
sed -e s/@VERSION/${VERSION}/g './docs/HOME.md' > ./out/HOME.md

if [ "$1" == "dev" ]; then
    watch -d jsdoc --configure docs/.jsdoc.json --verbose
else
    jsdoc --configure docs/.jsdoc.json --verbose
fi