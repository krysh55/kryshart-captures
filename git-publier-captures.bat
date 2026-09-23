@echo off
REM ============================================
REM  Publication du repo de captures - une seule fois.
REM  Pousse ce dossier vers github.com/krysh55/kryshart-captures
REM  (le repo public doit deja exister sur GitHub, vide).
REM ============================================
cd /d "%~dp0"
git init -b main
git add -A
git commit -m "Job de captures partenaires (GitHub Actions)"
git remote add origin https://github.com/krysh55/kryshart-captures.git
git push -u origin main
echo.
echo === Verification ===
git log --oneline -1
echo.
echo  Copie-colle TOUT dans le chat.
pause
