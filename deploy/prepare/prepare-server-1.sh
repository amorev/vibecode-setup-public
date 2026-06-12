SWAPFILE="/swapfile2"
SWAPSIZE="2G"
SWAPPINESS="80"

echo "==> Setting up swap (${SWAPSIZE})..."

if [ ! -f "$SWAPFILE" ]; then
  sudo fallocate -l "$SWAPSIZE" "$SWAPFILE"
  sudo chmod 600 "$SWAPFILE"
  sudo mkswap "$SWAPFILE"
  echo "Swap file created"
else
  echo "Swap file already exists"
fi

if ! swapon --show | grep -q "$SWAPFILE"; then
  echo "==> Enabling swap..."
  sudo swapon "$SWAPFILE"
else
  echo "Swap is already active"
fi

if ! grep -q "$SWAPFILE" /etc/fstab; then
  echo "==> Adding swap to /etc/fstab..."
  echo "$SWAPFILE none swap sw 0 0" | sudo tee -a /etc/fstab
else
  echo "Swap already present in fstab"
fi

echo "==> Setting swappiness to ${SWAPPINESS}..."
sudo sysctl vm.swappiness="$SWAPPINESS"

echo "==> Current swap status:"
swapon --show

mkdir -p /root/setup-data
while true; do
  read -rsp "Enter password: " PASS
  echo
  read -rsp "Repeat password: " PASS2
  echo

  if [ "$PASS" = "$PASS2" ]; then
    openssl passwd -6 "$PASS" > /root/setup-data/password.hash
    chmod 600 /root/setup-data/password.hash
    unset PASS PASS2
    echo "Saved to /root/setup-data/password.hash"
    break
  fi

  unset PASS PASS2
  echo "Passwords do not match. Try again."
done

cat > /root/setup-data/env.txt <<'EOF'
NEW_USERNAME=vibecoder
SSH_PORT=2091
EOF
chmod 600 /root/setup-data/env.txt
