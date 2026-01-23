#!/bin/bash

# Script to archive historical documentation files
# This moves implementation summaries and review documents to docs/archive/

# Don't exit on error - we want to continue even if some files don't exist
set +e

ARCHIVE_DIR="docs/archive"
ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

# Create archive directory if it doesn't exist
mkdir -p "$ARCHIVE_DIR"
mkdir -p "$ARCHIVE_DIR/vybzapp"
mkdir -p "$ARCHIVE_DIR/vybzapp/frontend"

echo "📦 Archiving historical documentation files..."
echo ""

# Root-level historical docs
HISTORICAL_DOCS=(
    "PHASE1_IMPLEMENTATION_SUMMARY.md"
    "EFFICIENCY_REVIEW.md"
    "LOGIN_IMPLEMENTATION_CONFIRMATION.md"
    "PASSWORD_RESET_EMAIL_CLARIFICATION.md"
    "SERIALIZER_EFFICIENCY_REVIEW.md"
    "SERIALIZER_ISSUES_EXPLAINED_SIMPLY.md"
    "SERIALIZER_OPTIMIZATION_RISKS.md"
    "TEST_BASELINE_BEFORE_PHASE1.md"
    "PRODUCT_PAGES_REVIEW_SUMMARY.md"
    "REACT_DJANGO_PAGE_ALIGNMENT.md"
    "TEST_REVIEW_STUDIOS_STORIES.md"
)

# vybzapp-level historical docs
VYBZAPP_HISTORICAL=(
    "vybzapp/CAMERA_CONTROLS_LOADING.md"
    "vybzapp/COMIC_3D_VIEWER_IMPLEMENTATION.md"
    "vybzapp/PRODUCTION_STATIC_FILES_REVIEW.md"
    "vybzapp/PROGRESSIVE_SAVING_TESTS.md"
    "vybzapp/SEASON_CREATION_IMPLEMENTATION.md"
    "vybzapp/TIMESTAMP_MIGRATION_SUMMARY.md"
)

# Frontend-level historical docs
FRONTEND_HISTORICAL=(
    "vybzapp/frontend/COMMON_STYLE_COMPONENT.md"
    "vybzapp/frontend/PRODUCTION_STATIC_FILES.md"
    "vybzapp/frontend/SCROLL_POSITION_IMPLEMENTATION.md"
    "vybzapp/frontend/STYLE_COMPONENT_ANALYSIS.md"
    "vybzapp/frontend/TEST_CHECKLIST.md"
    "vybzapp/frontend/TEST_DOCUMENTATION.md"
    "vybzapp/frontend/TEST_EFFICIENCY_REVIEW.md"
)

# Function to move file if it exists
move_file() {
    local file="$1"
    local dest_dir="$2"
    
    if [ -f "$file" ]; then
        echo "  ✓ Moving $file -> $dest_dir/"
        mv "$file" "$dest_dir/"
        return 0
    else
        echo "  ⊘ Not found: $file"
        return 0  # Don't fail if file doesn't exist
    fi
}

# Archive root-level docs
echo "📁 Archiving root-level historical docs..."
moved_count=0
for doc in "${HISTORICAL_DOCS[@]}"; do
    if move_file "$doc" "$ARCHIVE_DIR"; then
        ((moved_count++))
    fi
done
echo "   Moved $moved_count root-level files"
echo ""

# Archive vybzapp-level docs
echo "📁 Archiving vybzapp-level historical docs..."
moved_count=0
for doc in "${VYBZAPP_HISTORICAL[@]}"; do
    if move_file "$doc" "$ARCHIVE_DIR/vybzapp"; then
        ((moved_count++))
    fi
done
echo "   Moved $moved_count vybzapp-level files"
echo ""

# Archive frontend-level docs
echo "📁 Archiving frontend-level historical docs..."
moved_count=0
for doc in "${FRONTEND_HISTORICAL[@]}"; do
    if move_file "$doc" "$ARCHIVE_DIR/vybzapp/frontend"; then
        ((moved_count++))
    fi
done
echo "   Moved $moved_count frontend-level files"
echo ""

# Create README in archive directory
cat > "$ARCHIVE_DIR/README.md" << 'EOF'
# Archived Documentation

This directory contains historical documentation files that were created during development but are no longer actively maintained.

## Contents

- **Root-level**: Implementation summaries, efficiency reviews, and phase documentation
- **vybzapp/**: Application-level implementation notes
- **vybzapp/frontend/**: Frontend-specific implementation notes

## Note

These files are kept for historical reference but are not part of the active documentation. For current documentation, see:

- `README.md` files
- `STORY_EXPORT_IMPORT_GUIDE.md`
- `VIEWS_SHARES_TESTS.md`
- `COLLABORATION_REQUEST_FLOW.md`
- Test documentation in `__tests__/` directories
EOF

echo "✅ Archive complete!"
echo ""
echo "📋 Summary:"
echo "   Archive location: $ARCHIVE_DIR"
echo "   README created: $ARCHIVE_DIR/README.md"
echo ""
echo "💡 Next steps:"
echo "   1. Review the archived files"
echo "   2. Commit the changes"
echo "   3. The archive directory is already in .gitignore"
echo ""




