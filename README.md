# MOLODST TUSA

Статический сайт вечеринок. Локально: `python3 -m http.server 8080` в корне.
Деплой: push в `main` → GitHub Actions публикует образ в GHCR → нода забирает по крону.
Схема и реестр — в репозитории `infra` (`registry/molodst-tusa.yaml`).
