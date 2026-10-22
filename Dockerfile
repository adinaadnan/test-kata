FROM node:24-alpine AS frontend-build
WORKDIR /build
COPY package*.json ./
RUN npm ci
COPY tsconfig.json vite.config.ts ./
COPY frontend/ ./frontend/
RUN npm run build

FROM python:3.13-slim
WORKDIR /app/backend
COPY backend/requirements.txt ./
RUN pip install --no-cache-dir -r requirements.txt
COPY backend/ ./
COPY database/ /app/database/
COPY --from=frontend-build /build/frontend/dist/ ./static/
ENV PORT=8000
EXPOSE 8000
USER nobody
CMD ["sh", "entrypoint.sh"]
