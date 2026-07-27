FROM node:22-bookworm-slim

RUN apt-get update \
  && apt-get install --yes --no-install-recommends python3 python3-pip \
  && rm -rf /var/lib/apt/lists/* \
  && python3 -m pip install --no-cache-dir --break-system-packages piper-tts

WORKDIR /app

COPY package.json package-lock.json ./
RUN npm install --include=dev

COPY server/package.json server/package-lock.json ./server/
RUN npm --prefix server install --include=dev

COPY . .

# Curriculum runtime consumes these immutable vendored artifacts. Copy them
# explicitly and reject the image if they do not match one another.
COPY data/curriculum/generated/common-core-k5-standards.json /app/data/curriculum/generated/common-core-k5-standards.json
COPY data/curriculum/generated/common-core-k5-manifest.json /app/data/curriculum/generated/common-core-k5-manifest.json

RUN npm --prefix server run prisma:generate \
  && npm run build \
  && npm --prefix server run build \
  && node server/dist/curriculum/infrastructure/cli/curriculum.js validate

ENV PIPER_MODEL_PATH=/app/en_US-hfc_female-medium.onnx
EXPOSE 8080
CMD ["node", "production.mjs"]
