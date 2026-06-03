@echo off
echo ============================================
echo  FEMS - Fire Extinguisher Management System
echo  TWZ Ltd - Development Startup Script
echo ============================================
echo.

echo [1/5] Starting User Service (port 3001)...
start "FEMS User Service" cmd /k "cd backend\user-service && npm run dev"
timeout /t 2 /nobreak >nul

echo [2/5] Starting Extinguisher Service (port 3002)...
start "FEMS Extinguisher Service" cmd /k "cd backend\extinguisher-service && npm run dev"
timeout /t 2 /nobreak >nul

echo [3/5] Starting Inspection Service (port 3003)...
start "FEMS Inspection Service" cmd /k "cd backend\inspection-service && npm run dev"
timeout /t 2 /nobreak >nul

echo [4/5] Starting Reporting Service (port 3004)...
start "FEMS Reporting Service" cmd /k "cd backend\reporting-service && npm run dev"
timeout /t 2 /nobreak >nul

echo [5/5] Starting API Gateway (port 3000)...
start "FEMS API Gateway" cmd /k "cd backend\api-gateway && npm run dev"
timeout /t 3 /nobreak >nul

echo [6/6] Starting React Frontend (port 5173)...
start "FEMS Frontend" cmd /k "cd frontend && npm run dev"

echo.
echo ============================================
echo  All services started!
echo.
echo  Frontend:    http://localhost:5173
echo  API Gateway: http://localhost:3000
echo  API Docs:    http://localhost:3000/api/docs
echo.
echo  Services:
echo  User:        http://localhost:3001
echo  Extinguisher:http://localhost:3002
echo  Inspection:  http://localhost:3003
echo  Reporting:   http://localhost:3004
echo ============================================
pause
