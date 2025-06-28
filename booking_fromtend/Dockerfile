# 1. 使用 Node 官方映像
FROM node:18

# 2. 建立工作目錄
WORKDIR /app

# 3. 複製 package.json 和 lock 檔
COPY package*.json ./

# 4. 安裝依賴
RUN npm install

# 5. 複製所有程式碼
COPY . .

# 6. 編譯 Next.js 專案
RUN npm run build

# 7. 使用預設的 3000 port
EXPOSE 3000

# 8. 啟動指令
CMD ["npm", "start"]
