# ParkWise API — Express + Prisma, run via tsx.
FROM node:20-alpine
WORKDIR /app

# Install dependencies. Prisma's postinstall needs the schema, so copy it first.
COPY package.json ./
COPY prisma ./prisma
RUN npm install

# Generate the Prisma client (explicit, in case postinstall was skipped).
RUN npx prisma generate

# Application source.
COPY tsconfig.json ./
COPY src ./src

EXPOSE 4000

# Default: run the API. The migrate service overrides this with `command:`.
CMD ["npm", "start"]
