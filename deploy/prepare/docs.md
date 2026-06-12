Сначала подготавливаем к настройке

```bash
wget -O /tmp/prepare-hermes.sh https://amorev.ru/misc/hermes/prepare-hermes-1.sh && sudo bash /tmp/prepare-hermes.sh
```
Теперь создаем пользователя и настраиваем безопасность

```bash
wget -O /tmp/prepare-hermes2.sh https://amorev.ru/misc/hermes/prepare-hermes-2.sh && sudo bash /tmp/prepare-hermes2.sh
```

Теперь устанавливаем гермес от имени пользователя hermes

```bash
curl -fsSL https://raw.githubusercontent.com/NousResearch/hermes-agent/main/scripts/install.sh | bash
```
