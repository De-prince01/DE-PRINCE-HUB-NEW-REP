@echo off
REM ============================================================
REM  DE-PRINCE  -  Step 1: Push to GitHub (run ONCE)
REM  Requires: git + a GitHub account (free private repo works)
REM  Creates the repo's GitHub origin and pushes branch "main".
REM ============================================================
setlocal
set /p GITHUB_USER=Your GitHub username: 
if "%GITHUB_USER%"=="" ( echo No username - cancelled. & exit /b 1 )

git remote remove origin 2>nul
git remote add origin https://github.com/%GITHUB_USER%/de-prince.git
git branch -M main
git push -u origin main

if errorlevel 1 (
  echo.
  echo PUSH FAILED. Common fixes:
  echo   1. Create the EMPTY private repo named "de-prince" first at
  echo      https://github.com/new   (do NOT add README/.gitignore)
  echo   2. On first push git asks for your GitHub username + a Personal
  echo      Access Token (Settings - Developer settings - Tokens).
  echo      Or install Git Credential Manager to log in with a browser.
) else (
  echo.
  echo PUSHED. Next: https://render.com - New - Blueprint - pick de-prince.
)
endlocal
pause