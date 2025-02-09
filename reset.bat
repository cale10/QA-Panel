@echo off
taskkill /F /IM electron.exe
taskkill /F /IM node.exe
rmdir /s /q node_modules
del package-lock.json
npm install
npm start
