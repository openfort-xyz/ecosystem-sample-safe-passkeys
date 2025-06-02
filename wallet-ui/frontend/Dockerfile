FROM node:20-alpine AS builder

ARG REACT_APP_PIMLICO_API_KEY
ARG REACT_APP_BACKEND_URL

ENV REACT_APP_PIMLICO_API_KEY=$REACT_APP_PIMLICO_API_KEY
ENV REACT_APP_BACKEND_URL=$REACT_APP_BACKEND_URL

WORKDIR /app
COPY . .

RUN apk add --no-cache jq
# Install dependencies
RUN yarn install
RUN yarn build

FROM nginx:1.25.4-alpine
ENV NODE_ENV=production
COPY --from=builder /app/build /usr/share/nginx/html
COPY --from=builder /app/nginx.conf /etc/nginx/conf.d/default.conf
EXPOSE 3000
CMD ["nginx", "-g", "daemon off;"]