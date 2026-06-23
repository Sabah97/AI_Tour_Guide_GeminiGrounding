@echo off
echo.
echo ========================================
echo  Installing Map Feature Dependencies
echo ========================================
echo.

cd client
echo Installing leaflet and react-leaflet (React 18 compatible)...
call npm install leaflet react-leaflet@4.2.1 --legacy-peer-deps

echo.
echo ========================================
echo  Installation Complete!
echo ========================================
echo.
echo Now run: npm run dev
echo.
pause
