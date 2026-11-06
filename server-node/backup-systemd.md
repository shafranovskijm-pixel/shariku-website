# Резервирование базы заказов

`backup.mjs` использует встроенный `node:sqlite.backup()` Node24. Это согласованный SQLite-снимок с учётом подтверждённых WAL-записей; обычное копирование работающего `.sqlite` таким снимком не является. После создания выполняются `PRAGMA quick_check` и проверка схемы. Только проверенная копия получает окончательное имя; лишь после этого применяется очистка старых копий.

Отдельный постоянный каталог резервных копий должен находиться вне webroot и вне дерева публичных файлов. Скрипт требует абсолютные `SHARIKU_SQLITE_PATH` и `SHARIKU_BACKUP_DIR`, отвергает символические ссылки и не допускает размещения исходной БД внутри каталога очистки. Каталог0700, файлы0600. Вывод содержит только результат/числа, без путей, контактов, SQL и секретов.

Параметры `SHARIKU_BACKUP_KEEP` (по умолчанию14, допустимо1–31) и `SHARIKU_BACKUP_MAX_DAYS` (по умолчанию14, допустимо1–31) ограничивают число и возраст копий. Удаляются только обычные файлы собственного точного шаблона `shariku-<UTCtimestamp>-<random>.sqlite` в проверенном каталоге. Ручные копии и другие файлы не затрагиваются. Неудачное создание не запускает очистку. Эксклюзивный `.shariku-backup.lock` предотвращает параллельный запуск; после аварии он намеренно не удаляется автоматически: администратор сначала проверяет отсутствие работающего backup-процесса, затем удаляет только этот файл.

Ниже шаблоны: root подставляет **подтверждённые** пути и пользователя реально развёрнутой службы. Не копировать пути с другого сервера. Закрытый EnvironmentFile содержит только настройки backup (ему не нужны токен бота, feed secret или OAuth).

```ini
# /etc/systemd/system/shariku-backup.service
[Unit]
Description=Private SQLite backup for Shariku orders
After=local-fs.target

[Service]
Type=oneshot
User=<service-user>
Group=<service-group>
WorkingDirectory=<absolute-application-directory>
EnvironmentFile=<absolute-private-backup-settings-file>
ExecStart=<absolute-node24-binary> <absolute-application-directory>/server-node/backup.mjs
UMask=0077
NoNewPrivileges=true
PrivateTmp=true
ProtectSystem=strict
ProtectHome=true
# SQLite может обновлять свои WAL/shm-файлы даже при чтении.
ReadWritePaths=<absolute-private-database-directory> <absolute-private-backup-directory>
TimeoutStartSec=180
```

```ini
# /etc/systemd/system/shariku-backup.timer
[Unit]
Description=Daily Shariku SQLite backup

[Timer]
OnCalendar=*-*-* 03:20:00 Asia/Vladivostok
Persistent=true
RandomizedDelaySec=300
Unit=shariku-backup.service

[Install]
WantedBy=timers.target
```

Настройки приватного EnvironmentFile:

```text
SHARIKU_SQLITE_PATH=<confirmed-private-database-file>
SHARIKU_BACKUP_DIR=<confirmed-private-backup-directory>
SHARIKU_BACKUP_KEEP=14
SHARIKU_BACKUP_MAX_DAYS=14
```

Развёртывание выполняет root отдельно: проверить пути, права и наличие Node24; вручную запустить один backup и проверить `ok:true`, затем включить timer. Ежедневная копия даёт до суток потери последних изменений при аварии. Копии на том же диске не защищают от потери сервера/диска; второе закрытое хранилище и восстановление на отдельной тестовой БД настраиваются отдельно. Не восстанавливать поверх работающей службы. Срок120дней у рабочих записей не продлевает срок резервных копий; их14-дневный срок задаётся отдельно.

Экспорт для Центра конверсий ограничен111днями от создания заказа, независимо от120-дневного хранения рабочих записей и14-дневного срока резервных копий.

Проверка: `node --test tests/sales-backup.test.mjs` проверяет чтение подтверждённых WAL-данных из отдельной копии, ограниченную очистку, неприкосновенность посторонних файлов и старых копий при ошибке, блокировку и отказ от небезопасных путей.
