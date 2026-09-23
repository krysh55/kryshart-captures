# Captures partenaires — Krysh.Art

Repo public technique. Chaque nuit (6h, Montréal), GitHub Actions ouvre chaque
site partenaire listé dans le `site-data.json` du site en ligne, ferme la
bannière de cookies, et committe une capture fraîche dans `captures/<id>.jpg`.

Le site Krysh.Art affiche ces images via leur URL brute
(`raw.githubusercontent.com/.../captures/<id>.jpg`) — toujours à jour, sans
redéploiement. En cas d'échec d'une capture, l'image précédente est conservée,
et le site a de toute façon une copie locale de secours.

Lancement manuel : onglet **Actions** → « Captures partenaires » → **Run workflow**.
