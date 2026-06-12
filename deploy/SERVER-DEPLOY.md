# Server Deploy — инструкция для агента

Как развернуть проект `vibecode-setup-public` на чистом Linux-сервере (Ubuntu 22+) с доступом `sudo` у текущего пользователя. Итог: systemd-сервис `vibecode-setup.service`, автостарт при загрузке, доступ через `http://<IP>:3000`.

**Никаких Docker / nginx / certbot / SSL.** Это тестовая установка.

---

## Предусловия

- Linux-сервер (Ubuntu 22.04+ / Debian 12+), `systemd` PID 1
- Пользователь с `sudo NOPASSWD` (или пароль в `.env` MCP)
- Минимум 512 MB RAM, 1 GB диска
- Открытый порт 3000/tcp (или настройка firewall позже)
- Локально: `tar` (всегда), копия проекта

Работа идёт через субагентов:
- **`server-operator`** — shell-команды на сервере (`ssh_connect_exec` / `ssh_connect_sudo-exec`)
- **`sftp-operator`** — загрузка/скачивание файлов (`sftp_connect_sftp_upload` / `sftp_download` / `sftp_list`)

**Не вызывай** `mcp__ssh-connect__*` и `mcp__sftp-connect__*` напрямую — делегируй субагентам. Подробнее о разделении SFTP/SSH — в `AGENTS.md` и в субагентских инструкциях `.pi/agents/`.

---

## 0. Проверить окружение на сервере

Делегируй:

```typescript
subagent({
  agent: "server-operator",
  task: "Через ssh_connect_exec выполни на сервере блок диагностики одной командой:\n\n" +
    "echo \"=== OS ===\" && cat /etc/os-release | head -3; " +
    "echo \"=== systemd ===\" && pidof systemd >/dev/null && echo \"systemd: ok\" || echo \"systemd: MISSING\"; " +
    "echo \"=== sudo ===\" && sudo -n true 2>&1 && echo \"sudo NOPASSWD: ok\" || echo \"sudo: needs password\"; " +
    "echo \"=== user ===\" && whoami && id; " +
    "echo \"=== node ===\" && command -v node || echo \"node: NOT installed\"; " +
    "echo \"=== tar ===\" && which tar; " +
    "echo \"=== /opt and HOME ===\" && ls -la /opt 2>/dev/null | head -3 && ls -la $HOME | head -3; " +
    "echo \"=== external IP ===\" && curl -s -4 --max-time 5 ipv4.icanhazip.com.\n\n" +
    "Верни exit code и stdout целиком. Не интерпретируй."
})
```

**Что проверить в выводе:**

- `OS` содержит `Ubuntu` или `Debian`
- `systemd: ok`
- `sudo NOPASSWD: ok` — если нет, **стоп**, нужно сначала настроить `sudo NOPASSWD` (руками, не из агента)
- `node` — может отсутствовать, это ОК

Если чего-то критичного нет — **не продолжай**, доложи главному агенту.

---

## 1. Установить Node.js 22 LTS через nvm

Делегируй:

```typescript
subagent({
  agent: "server-operator",
  task: "Через ssh_connect_sudo-exec установи nvm и Node 22 LTS от имени обычного пользователя (НЕ root). Выполни последовательно:\n\n" +
    "1. sudo -u vibecoder bash -lc 'curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.40.3/install.sh | bash' 2>&1 | tail -3\n" +
    "2. ls -la /home/vibecoder/.nvm | head -3\n" +
    "3. sudo -u vibecoder bash -lc 'export NVM_DIR=\"$HOME/.nvm\" && [ -s \"$NVM_DIR/nvm.sh\" ] && . \"$NVM_DIR/nvm.sh\" && nvm install 22 && nvm use 22 && nvm alias default 22' 2>&1 | tail -10\n" +
    "4. sudo -u vibecoder bash -lc 'export NVM_DIR=\"$HOME/.nvm\" && . \"$NVM_DIR/nvm.sh\" && node -v && npm -v && npx --version'\n\n" +
    "Верни результат каждой команды. Не интерпретируй."
})
```

**Что должно быть в выводе:** `v22.x.y`, `10.x.y`, `10.x.y`.

**Запомни точный путь к node** — он понадобится в systemd unit. Обычно это `/home/<USER>/.nvm/versions/node/v22.22.3/bin/node` (подставь реальную версию).

---

## 2. Подготовить директорию проекта

Путь — **`/home/<USER>/app/`** (не `/opt/app`, потому что у обычного пользователя может не быть прав на `/opt`).

Делегируй:

```typescript
subagent({
  agent: "server-operator",
  task: "Через ssh_connect_sudo-exec создай /home/vibecoder/app/ и сделай владельцем vibecoder:\n\n" +
    "mkdir -p /home/vibecoder/app && chown vibecoder:vibecoder /home/vibecoder/app && ls -la /home/vibecoder/app\n\n" +
    "Верни результат."
})
```

---

## 3. Залить файлы проекта (SFTP)

**Принцип:** SFTP для данных (move files), SSH для действий (unpack, install, restart). В этом проекте для заливки файлов **только** SFTP (`mcp__sftp-connect__sftp_upload`). `scp` / `rsync` / `tar | ssh` / `curl file://` **не используются** — это нарушает разделение протоколов и не даст корректного аудита.

### Шаг 3.1: Упаковать проект локально

Локально (своим `bash`, **не** через `server-operator` — у него нет `bash`):

```bash
mkdir -p .tmp
cd /path/to/vibecode-setup-public
tar --exclude='./node_modules' \
    --exclude='./.git' \
    --exclude='./dist' \
    --exclude='./logs' \
    --exclude='./data' \
    --exclude='./.env' \
    --exclude='./playwright-report' \
    --exclude='./test-results' \
    --exclude='./.idea' \
    --exclude='./.tmp' \
    -czf .tmp/release.tar.gz .

# sanity-check
tar -tzf .tmp/release.tar.gz | wc -l        # 200-300 файлов
tar -tzf .tmp/release.tar.gz | head -20     # top-level: agents.md apps deploy docs ...
ls -la .tmp/release.tar.gz                   # ~1-3 MB
# Зафиксируй SHA локально — понадобится для проверки
sha256sum .tmp/release.tar.gz
```

**Исключения — обязательны:** `node_modules` ~270 МБ, `.env` (локальный с SSH-кредами), `dist` (пересоберётся на сервере), `data` (продовая БД, нельзя затирать), `.tmp` (иначе tar в tar).

### Шаг 3.2: Залить tar.gz через SFTP

Делегируй **`sftp-operator`** (или вызови `mcp__sftp-connect__sftp_upload` сам, если ты оркестратор и SFTP-инструмент доступен):

```typescript
subagent({
  agent: "sftp-operator",
  task: "Загрузи локальный файл <repo>/.tmp/release.tar.gz на сервер в /home/vibecoder/app/release.tar.gz через mcp__sftp-connect__sftp_upload. Верни результат MCP дословно."
})
// Или напрямую:
// mcp__sftp-connect__sftp_upload
//   localPath:  <repo-root>/.tmp/release.tar.gz   (абсолютный путь)
//   remotePath: /home/vibecoder/app/release.tar.gz
// Ожидаемый ответ: "File uploaded to /home/vibecoder/app/release.tar.gz"
```

### Шаг 3.3: Распаковать на сервере (SSH)

Делегируй **`server-operator`**:

```typescript
subagent({
  agent: "server-operator",
  task: "Через ssh_connect_exec от имени vibecoder распакуй release.tar.gz в ~/app/, проверь SHA и посчитай файлы:\n\n" +
    "cd ~/app && \\\n" +
    "  echo '--- SHA на сервере ---' && sha256sum release.tar.gz && \\\n" +
    "  echo '--- распаковка ---' && tar -xzf release.tar.gz && \\\n" +
    "  echo '--- file count (без data и node_modules) ---' && \\\n" +
    "  find . -type f -not -path './data/*' -not -path './node_modules/*' | wc -l && \\\n" +
    "  echo '--- top-level ---' && ls -la | head -15 && \\\n" +
    "  rm -f release.tar.gz && \\\n" +
    "  echo 'OK'\n\n" +
    "Верни результат. Локальный SHA (для сравнения): <вставить sha256sum из шага 3.1>."
})
```

**Проверка успешности:** SHA на сервере == SHA локально. Файлов 200–300. В `ls` видны `agents.md`, `apps/`, `package.json`. **Если SHA не совпадает** — стоп, файл повреждён при передаче (редко, но бывает), перезалей.

### Шаг 3.4: Удалить локальный архив

Локально (своим `bash`):

```bash
rm -f .tmp/release.tar.gz
```

### Почему не `scp` / `rsync` / `tar | ssh`

| Метод | Проблема |
|-------|----------|
| `scp` | Другой протокол (поверх SSH), не идёт через `sftp-connect` MCP — нарушает разделение SFTP/SSH и теряет аудит в логах `sftp-connect` |
| `rsync` | То же + дельта-синхронизация усложняет отладку; первый запуск всё равно копирует всё |
| `tar -czf - \| ssh tar -xzf -` | Стрим SSH-ом; загрузка и распаковка неразделимы — нельзя ни SHA проверить перед распаковкой, ни откатить неполный архив; маскирует ошибки передачи |
| `curl file://` | Не работает для удалённого сервера; для upload обычно `curl -T`, но это снова обход протокола |

**SFTP + tar.gz + ssh_connect_exec** — единственный путь, который даёт:
- Атомарный артефакт (один файл известного размера и SHA)
- Разделение «доставка данных» / «выполнение действий» (логи SFTP отдельно от логов SSH)
- Возможность при необходимости скачать архив обратно (`sftp_download`) для офлайн-диагностики
- Проверку целостности до того, как файлы распакованы и затерли что-то на сервере

### Если SFTP недоступен в runtime

Если `mcp__sftp-connect__*` не прокидывается в текущий контекст субагента:
1. Попроси главного агента выполнить `mcp__sftp-connect__sftp_upload` **самого**
2. Не пытайся обойти через `scp` / `rsync` / `cat | ssh tar` — это нарушает проектное разделение и при следующем запуске сломает воспроизводимость

---

## 4. Установить зависимости на сервере

Делегируй:

```typescript
subagent({
  agent: "server-operator",
  task: "Через ssh_connect_exec от имени vibecoder установи зависимости и собери проект:\n\n" +
    "cd ~/app && source $HOME/.nvm/nvm.sh && nvm use 22 >/dev/null 2>&1 && \\\n" +
    "  npm ci --no-audit --no-fund 2>&1 | tail -8 && \\\n" +
    "  echo '--- build ---' && \\\n" +
    "  npm run build 2>&1 | tail -15 && \\\n" +
    "  echo '--- dist files ---' && \\\n" +
    "  ls apps/backend/dist/main.js apps/frontend/dist/index.html\n\n" +
    "Верни результат. Должно быть: 600+ packages added за 10-30 сек, затем 'built in N s' и список dist-файлов."
})
```

**Проверь:** `apps/backend/dist/main.js` и `apps/frontend/dist/index.html` существуют. Если `npm ci` падает — **стоп**, доложи.

---

## 5. Создать `.env` для production

**Генерируем JWT_SECRET** (на сервере):

```typescript
subagent({
  agent: "server-operator",
  task: "Через ssh_connect_exec от имени vibecoder сгенерируй JWT secret и собери .env:\n\n" +
    "SECRET=$(cat /proc/sys/kernel/random/uuid | tr -d '-' | head -c 32)$(cat /proc/sys/kernel/random/uuid | tr -d '-' | head -c 32); \\\n" +
    "IP=$(curl -s -4 --max-time 5 ipv4.icanhazip.com); \\\n" +
    "echo \"SECRET=$SECRET\"; echo \"IP=$IP\"; \\\n" +
    "cat > ~/app/apps/backend/.env <<EOF\n" +
    "DB_TYPE=sqlite\n" +
    "DB_SQLITE_PATH=./data/database.sqlite\n" +
    "PORT=3000\n" +
    "JWT_SECRET=$SECRET\n" +
    "ADMIN_LOGIN=admin\n" +
    "ADMIN_PASSWORD=admin_test_2026\n" +
    "CORS_ORIGIN=http://$IP:3000,http://localhost:3000\n" +
    "EOF\n" +
    "chmod 600 ~/app/apps/backend/.env && cat ~/app/apps/backend/.env\n\n" +
    "Верни вывод."
})
```

**Что проверить:** `JWT_SECRET` длиной 64 hex символа, `CORS_ORIGIN` содержит правильный IP. Пароль `ADMIN_PASSWORD` — поменяй, если тестовая установка выйдет в свет.

---

## 6. Создать systemd unit

Делегируй **ОДНОЙ** командой (используется heredoc — её нужно передать аккуратно):

```typescript
subagent({
  agent: "server-operator",
  task: "Через ssh_connect_sudo-exec создай systemd unit /etc/systemd/system/vibecode-setup.service со следующим содержимым (подставь реальный путь к node из шага 1, обычно /home/vibecoder/.nvm/versions/node/v22.22.3/bin/node):\n\n" +
    "cat > /etc/systemd/system/vibecode-setup.service <<'UNIT_EOF'\n" +
    "[Unit]\n" +
    "Description=VibeSetup (Nest.js + Vue 3 SPA)\n" +
    "After=network.target\n" +
    "\n" +
    "[Service]\n" +
    "Type=simple\n" +
    "User=vibecoder\n" +
    "Group=vibecoder\n" +
    "WorkingDirectory=/home/vibecoder/app\n" +
    "EnvironmentFile=/home/vibecoder/app/apps/backend/.env\n" +
    "ExecStart=/home/vibecoder/.nvm/versions/node/v22.22.3/bin/node /home/vibecoder/app/apps/backend/dist/main.js\n" +
    "Restart=on-failure\n" +
    "RestartSec=5\n" +
    "\n" +
    "StandardOutput=append:/home/vibecoder/app/logs/systemd-stdout.log\n" +
    "StandardError=append:/home/vibecoder/app/logs/systemd-stderr.log\n" +
    "\n" +
    "NoNewPrivileges=true\n" +
    "PrivateTmp=true\n" +
    "ProtectSystem=full\n" +
    "\n" +
    "[Install]\n" +
    "WantedBy=multi-user.target\n" +
    "UNIT_EOF\n" +
    "systemctl daemon-reload && \\\n" +
    "mkdir -p /home/vibecoder/app/logs && chown vibecoder:vibecoder /home/vibecoder/app/logs && \\\n" +
    "systemctl enable vibecode-setup.service && \\\n" +
    "echo '--- file ---' && cat /etc/systemd/system/vibecode-setup.service && \\\n" +
    "echo '--- enabled? ---' && systemctl is-enabled vibecode-setup.service\n\n" +
    "Верни exit code и вывод. Должно быть: unit file показан, is-enabled = enabled."
})
```

**Что проверить:**
- `WantedBy=multi-user.target` есть (без него автостарта не будет)
- `ExecStart` указывает на **реальный** путь к `node` (проверь, что путь существует: `ls -la /home/vibecoder/.nvm/versions/node/v22.22.3/bin/node`)
- `EnvironmentFile` указывает на созданный `.env`
- `is-enabled` = `enabled`

---

## 7. Запустить сервис и проверить

Делегируй:

```typescript
subagent({
  agent: "server-operator",
  task: "Через ssh_connect_sudo-exec запусти и проверь сервис:\n\n" +
    "systemctl start vibecode-setup.service 2>&1 && \\\n" +
    "sleep 2 && \\\n" +
    "echo '--- status ---' && systemctl status vibecode-setup.service --no-pager -l 2>&1 | head -15 && \\\n" +
    "echo '--- listen ---' && ss -tlnp 2>&1 | grep :3000 && \\\n" +
    "echo '--- http test ---' && curl -s -m 5 -i http://127.0.0.1:3000/api/users/count\n\n" +
    "Верни exit code и вывод. Должно быть: 'Active: active (running)', node слушает :3000, GET /api/users/count → 200 с JSON."
})
```

**Что проверить:**
- `Active: active (running)`
- Порт `:3000` в `ss -tlnp`
- `GET /api/users/count` → `200 OK` + JSON вроде `{"total":1,"adminCount":1}`

Если статус `failed` — `journalctl -u vibecode-setup.service -n 30 --no-pager` и **не продолжай**.

---

## 8. Открыть порт в firewall (ОБЯЗАТЕЛЬНО)

**Не пропускай этот шаг.** По умолчанию UFW имеет `Default: deny (incoming)`, и без `allow 3000/tcp` порт будет торчать в никуда: сервер его слушает, но никто снаружи не достучится. `curl` с самого сервера (`127.0.0.1:3000`) проходит и маскирует проблему — loopback не проходит через UFW.

```typescript
subagent({
  agent: "server-operator",
  task: "Через ssh_connect_sudo-exec настрой UFW — это ОБЯЗАТЕЛЬНЫЙ шаг:\n\n" +
    "ufw allow 3000/tcp && \\\n" +
    "echo '--- ufw status ---' && \\\n" +
    "ufw status verbose 2>&1\n\n" +
    "Должно быть правило '3000/tcp ALLOW IN Anywhere'. Если ufw inactive — всё равно открой порт командой выше, она идемпотентна. Верни вывод."
})
```

---

## 9. Финальная проверка извне

```typescript
subagent({
  agent: "server-operator",
  task: "Через ssh_connect_exec выполни финальную проверку:\n\n" +
    "IP=$(curl -s -4 --max-time 5 ipv4.icanhazip.com); \\\n" +
    "echo \"--- external IP: $IP ---\"; \\\n" +
    "echo \"--- GET / ---\" && curl -s -m 5 -o /dev/null -w 'HTTP %{http_code}\\n' http://$IP:3000/; \\\n" +
    "echo \"--- GET /api/users/count ---\" && curl -s -m 5 http://$IP:3000/api/users/count; \\\n" +
    "echo; echo \"--- journalctl tail ---\" && journalctl -u vibecode-setup.service -n 10 --no-pager\n\n" +
    "Верни вывод."
})
```

**Что проверить:** оба HTTP-запроса вернули 200, в journalctl нет ERROR.

---

## Готово

Сервис развёрнут, автозапуск включён, доступ через `http://<IP>:3000`.

Дальше: можно заходить в админку по `http://<IP>:3000/#/login` (логин/пароль из шага 5).

---

## Обновление приложения (повторный deploy)

**Сначала — залить файлы через SFTP** (шаг 3.1–3.2), **затем** — выполнить SSH-команды ниже. Без нового архива `rm -rf dist && npm ci && npm run build` просто пересоберёт старый код.

```typescript
// Шаг 1: залить новый tar.gz (см. шаг 3.1–3.2 выше)
//   - sftp-operator: mcp__sftp-connect__sftp_upload .tmp/release.tar.gz → /home/vibecoder/app/release.tar.gz
//   - server-operator: tar -xzf release.tar.gz в ~/app/ + sha256sum + rm -f release.tar.gz

// Шаг 2: перезапустить с новым кодом
subagent({
  agent: "server-operator",
  task: "Через ssh_connect_sudo-exec обнови приложение до залитой версии:\n\n" +
    "systemctl stop vibecode-setup.service && \\\n" +
    "sudo -u vibecoder bash -lc 'cd ~/app && source $HOME/.nvm/nvm.sh && nvm use 22 >/dev/null 2>&1 && \\\n" +
    "  rm -rf apps/frontend/dist apps/backend/dist && \\\n" +
    "  npm ci --no-audit --no-fund 2>&1 | tail -3 && \\\n" +
    "  npm run build 2>&1 | tail -3' && \\\n" +
    "systemctl start vibecode-setup.service && \\\n" +
    "sleep 2 && \\\n" +
    "systemctl status vibecode-setup.service --no-pager -l | head -10 && \\\n" +
    "echo '--- healthcheck ---' && curl -s -m 5 http://127.0.0.1:3000/api/users/count && \\\n" +
    "echo '--- новые ассеты ---' && curl -s -m 5 http://127.0.0.1:3000/ | grep -oE 'assets/index-[^\"]+\\.js' | head -1 && \\\n" +
    "echo '--- dist assets ---' && ls /home/vibecoder/app/apps/frontend/dist/assets/ 2>/dev/null | head -15\n\n" +
    "Верни результат."
})
```

**КРИТИЧНО:** в update-команде обязательно `rm -rf apps/frontend/dist apps/backend/dist` перед `npm run build`. Без этого Vite может переиспользовать старый `dist/` и новые чанки (например, новые View-файлы) **не попадут в сборку** — приложение продолжит отдавать старую версию, хотя `systemctl status` показывает `active (running)`. Это тихая проблема: ошибок нет, healthcheck 200, но визуально ничего не изменилось.

**Проверка успешного обновления:** после билда в выводе `npm run build` должны быть **новые ассеты** (`*.js` с новыми хешами). Если добавлялся новый view/component — ищите его в списке (например, `NewView-XXXX.js`).

**Полная цепочка update-deploy:**

1. **Локально (своим `bash`):** создать новый `.tmp/release.tar.gz` (см. шаг 3.1), зафиксировать `sha256sum`
2. **sftp-operator:** `mcp__sftp-connect__sftp_upload` — залить tar.gz на сервер
3. **server-operator:** `tar -xzf` + `sha256sum` (сверить) + `rm -f release.tar.gz`
4. **server-operator:** `systemctl stop` + `rm -rf dist` + `npm ci` + `npm run build` + `systemctl start` + healthcheck (блок выше)

---

## Логи и отладка

```typescript
// Live-логи systemd
subagent({ agent: "server-operator", task: "Через ssh_connect_exec выполни: journalctl -u vibecode-setup.service -f (с таймаутом 10 сек, потом Ctrl+C). Верни то, что успело вывестись." })

// Файловые логи приложения
subagent({ agent: "server-operator", task: "Через ssh_connect_exec выполни: tail -100 ~/app/logs/systemd-stdout.log && echo '--- stderr ---' && tail -50 ~/app/logs/systemd-stderr.log. Верни вывод." })
```

---

## Типичные ошибки и фиксы

| Симптом | Причина | Фикс |
|---------|--------|------|
| `systemd: MISSING` | Не Linux или контейнер без init | Не наш случай, остановись |
| `sudo: needs password` | NOPASSWD не настроен | Настрой руками `sudo visudo`, потом продолжи |
| `node: NOT installed` после диагностики | ОК, установим на шаге 1 | Продолжай |
| `npm ci` падает с `EACCES` | Нет прав на запись | Проверь владельца `~/app`: должен быть `vibecoder` |
| `npm run build` падает | Отсутствуют dev-deps | Уже `npm ci` ставит всё; проверь версию Node (нужна 22+) |
| `Active: failed` при старте | Путь к node неверный или .env не читается | `journalctl -xeu vibecode-setup.service` → фикс → `systemctl daemon-reload && systemctl restart vibecode-setup.service` |
| `Connection refused` на 3000 | Сервис не слушает / firewall | **Сначала `ss -tlnp \| grep 3000`** — если слушает, **100% UFW**. `sudo ufw allow 3000/tcp` |
| `CORS blocked` в браузере | `CORS_ORIGIN` не содержит твой origin | Допиши в `.env` и `systemctl restart vibecode-setup.service` |
| `EADDRINUSE` | Порт занят другим процессом | `ss -tlnp \| grep 3000` → убей процесс или смени `PORT` в `.env` |

---

## Безопасность: что **не** делается в этой инструкции

- **Нет reverse proxy** — порт 3000 торчит в интернет напрямую. Для production-уровня защиты добавь nginx (отдельная инструкция).
- **Нет SSL** — трафик идёт по HTTP, логины/пароли передаются открыто. **Только для теста**.
- **Нет fail2ban / SSH hardening** — должна быть настроена на этапе prepare-server (руками владельца).
- **`ProtectHome=read-only` отключён** в unit — приложение живёт в `/home/<USER>`. Если хочешь изолировать — перенеси в `/opt/app` и верни `ProtectHome`.
- **Локальный `.env` (с SSH-кредами) НЕ заливается** — это другой файл, лежит в `/home/<USER>/.env` локальной машины. На сервер попадает только `apps/backend/.env` с prod-настройками.
