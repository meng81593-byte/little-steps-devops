# 第一阶段：借用 Node.js 环境把你的 TypeScript 游戏源码编译成网页文件
FROM node:18 AS builder
WORKDIR /app
COPY package*.json ./
RUN npm install
COPY . .
RUN npm run build

# 第二阶段：借用 Nginx 服务器，只把上一步做好的成品塞进去，丢掉笨重的源码
FROM nginx:alpine
COPY --from=builder /app/dist /usr/share/nginx/html
EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]