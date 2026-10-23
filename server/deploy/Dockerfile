FROM node:22-alpine
WORKDIR /app
COPY package.json ./
COPY packages ./packages
COPY server ./server
WORKDIR /app/server
ENV NODE_ENV=production
EXPOSE 8080
COPY tools/runtime /app/tools/runtime
CMD ["node", "--import", "../tools/runtime/register.mjs", "src/main.ts"]
