# SSH Setup Guide for DigitalOcean Server

## Step 1: Check if you have SSH keys on your local machine

Run this command to see if you have SSH keys:
```bash
ls -la ~/.ssh/
```

Look for files like:
- `id_rsa` and `id_rsa.pub` (RSA key)
- `id_ed25519` and `id_ed25519.pub` (ED25519 key - recommended)
- `id_ecdsa` and `id_ecdsa.pub` (ECDSA key)

## Step 2: Display your public key

If you have a key, display it:
```bash
# For RSA key
cat ~/.ssh/id_rsa.pub

# OR for ED25519 key (recommended)
cat ~/.ssh/id_ed25519.pub
```

**Copy the entire output** - it will look like:
```
ssh-rsa AAAAB3NzaC1yc2EAAAADAQABAAABAQ... your-email@example.com
```
or
```
ssh-ed25519 AAAAC3NzaC1lZDI1NTE5AAAAI... your-email@example.com
```

## Step 3: Get your server information from DigitalOcean

1. Go to your DigitalOcean dashboard
2. Click on your droplet/server
3. Note down:
   - **IP Address** (e.g., `123.45.67.89`)
   - **Username** (usually `root` for new droplets, or a custom user)

## Step 4: Add your public key to the server

### Option A: Using DigitalOcean Console (Current Method)

1. In the DigitalOcean console, run:
   ```bash
   # Create .ssh directory if it doesn't exist
   mkdir -p ~/.ssh
   chmod 700 ~/.ssh
   
   # Add your public key to authorized_keys
   echo "YOUR_PUBLIC_KEY_HERE" >> ~/.ssh/authorized_keys
   chmod 600 ~/.ssh/authorized_keys
   ```

   Replace `YOUR_PUBLIC_KEY_HERE` with the public key you copied in Step 2.

### Option B: Using DigitalOcean's SSH Key Feature (Recommended)

1. In DigitalOcean dashboard, go to **Settings** → **Security** → **SSH Keys**
2. Click **Add SSH Key**
3. Paste your public key
4. Give it a name (e.g., "My Laptop")
5. When creating a new droplet, select this key
6. For existing droplets, you can add it via the console (Option A)

## Step 5: Connect via SSH

From your local machine, run:
```bash
ssh root@YOUR_SERVER_IP
```

Or if you have a custom user:
```bash
ssh username@YOUR_SERVER_IP
```

**First time connection:**
- You'll see a message about host authenticity - type `yes`
- If you set up a password, enter it
- If you added your SSH key correctly, you should connect without a password

## Step 6: Troubleshooting

### If connection is refused:
- Check that your server IP is correct
- Verify SSH is running on the server: `sudo systemctl status ssh` (in console)

### If asked for password but you want key authentication:
1. Check your public key is in `~/.ssh/authorized_keys` on the server:
   ```bash
   cat ~/.ssh/authorized_keys
   ```
2. Verify permissions:
   ```bash
   chmod 700 ~/.ssh
   chmod 600 ~/.ssh/authorized_keys
   ```

### If you don't have SSH keys:
Generate a new one:
```bash
# Generate ED25519 key (recommended)
ssh-keygen -t ed25519 -C "your-email@example.com"

# OR generate RSA key (if ED25519 not supported)
ssh-keygen -t rsa -b 4096 -C "your-email@example.com"
```

Press Enter to accept default location, and optionally set a passphrase.

## Step 7: Create SSH config for easier access (Optional)

Create/edit `~/.ssh/config` on your local machine:
```
Host vybz-production
    HostName YOUR_SERVER_IP
    User root
    IdentityFile ~/.ssh/id_ed25519
    Port 22
```

Then you can connect with:
```bash
ssh vybz-production
```

## Quick Reference Commands

**On your local machine:**
```bash
# Show your public key
cat ~/.ssh/id_ed25519.pub  # or id_rsa.pub

# Test SSH connection
ssh -v root@YOUR_SERVER_IP
```

**On the server (via DigitalOcean console):**
```bash
# Check authorized keys
cat ~/.ssh/authorized_keys

# Check SSH service
sudo systemctl status ssh

# View SSH logs if connection fails
sudo tail -f /var/log/auth.log
```
