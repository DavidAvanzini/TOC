FROM node:20-alpine
WORKDIR /app

COPY package.json pnpm-workspace.yaml .
COPY . .

RUN npm install
RUN npm run build

EXPOSE 4173
CMD ["npm", "run", "preview", "--", "--host", "0.0.0.0", "--port", "4173"]
