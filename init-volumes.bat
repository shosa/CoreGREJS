@echo off
REM Script to initialize Docker volumes on Windows

echo Initializing CoreGREJS Docker volumes...

REM Create volume directory structure
if not exist "volumes\backend\storage\export\temp" mkdir "volumes\backend\storage\export\temp"
if not exist "volumes\backend\storage\export\src" mkdir "volumes\backend\storage\export\src"
if not exist "volumes\backend\storage\jobs" mkdir "volumes\backend\storage\jobs"
if not exist "volumes\backend\storage\uploads" mkdir "volumes\backend\storage\uploads"
if not exist "volumes\backend\storage\logs" mkdir "volumes\backend\storage\logs"

echo Volume initialization complete!
echo.
echo Directory structure:
dir /S /B volumes\backend\storage
echo.
echo You can now run: docker-compose up -d
pause
