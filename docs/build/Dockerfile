# A part of the AegisBlade Node.js Client Library
# Copyright (C) 2019 Thornbury Organization, Bryan Thornbury
# This file may be used under the terms of the GNU Lesser General Public License, version 2.1.
# For more details see: https://www.gnu.org/licenses/lgpl-2.1.html

FROM node:11-slim

RUN npm install -g jsdoc
RUN apt-get update && apt-get install -qqy watch git

RUN mkdir /template
RUN git clone https://github.com/aegisblade/jsdoc-template.git /template

WORKDIR /app

RUN groupmod -g 1001 node \
  && usermod -u 1001 -g 1001 node

ARG userid
ENV userid=${userid}

RUN groupadd -r container_user && useradd --no-log-init -u ${userid} -m -r -g container_user container_user

COPY --chown=container_user:container_user ./entrypoint.sh /entrypoint.sh
RUN chown -R container_user:container_user /template
USER container_user

ENTRYPOINT ["/entrypoint.sh"]