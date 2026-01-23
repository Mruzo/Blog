#!/bin/bash
# Script to upgrade virtual environment to Python 3.12 (full OpenSSL 3.0 support)

set -e

cd /home/chris/applications/vybz

echo "=== Upgrading Virtual Environment to Python 3.12 ==="
echo ""
echo "First, install python3-venv if not already installed:"
echo "  sudo apt-get install python3-venv"
echo ""
read -p "Press Enter to continue after installing python3-venv..."

# Step 1: Deactivate if active
if [ -n "$VIRTUAL_ENV" ]; then
    echo "Deactivating current virtual environment..."
    deactivate
fi

# Step 2: Backup requirements
echo "Backing up requirements.txt..."
cp requirements.txt requirements.txt.backup

# Step 3: Remove old virtual environment
echo "Removing old virtual environment..."
rm -rf vybzenv

# Step 4: Create new virtual environment with Python 3.12
echo "Creating new virtual environment with Python 3.12..."
python3.12 -m venv vybzenv

# Step 5: Activate new virtual environment
echo "Activating new virtual environment..."
source vybzenv/bin/activate

# Step 6: Verify Python version
echo ""
echo "=== Verification ==="
echo "Python version: $(python --version)"
echo "Python path: $(which python)"

# Step 7: Test SSL
echo ""
echo "Testing SSL import..."
python -c "import ssl; print('✓ SSL works! OpenSSL version:', ssl.OPENSSL_VERSION)" || {
    echo "✗ SSL test failed!"
    exit 1
}

# Step 8: Upgrade pip
echo ""
echo "Upgrading pip..."
pip install --upgrade pip

# Step 8.5: Install system libraries for Pillow (if needed)
echo ""
echo "Note: If Pillow installation fails, install required packages:"
echo "  sudo apt-get install python3.12-dev libjpeg-dev zlib1g-dev libtiff-dev libfreetype6-dev liblcms2-dev libwebp-dev libopenjp2-7-dev libharfbuzz-dev libfribidi-dev libxcb1-dev"

# Step 9: Install dependencies
echo ""
echo "Installing dependencies from requirements.txt..."
pip install -r requirements.txt || {
    echo ""
    echo "⚠ Installation failed. You may need to install system libraries first:"
    echo "  sudo apt-get install libjpeg-dev zlib1g-dev libtiff-dev libfreetype6-dev liblcms2-dev libwebp-dev libopenjp2-7-dev libharfbuzz-dev libfribidi-dev libxcb1-dev"
    echo "Then run: pip install -r requirements.txt"
    exit 1
}

echo ""
echo "=== Upgrade Complete! ==="
echo "Virtual environment upgraded to Python 3.12"
echo "You can now run: python manage.py runserver --settings 'snm.settings.local'"
