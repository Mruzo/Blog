# Story Export/Import System Guide

## Overview

The Story Export/Import system allows you to transfer complete story data between different instances of the 3D Comic app. This includes all story content, characters, dialogues, camera settings, and optionally file data.

## Features

### ✅ What Gets Exported/Imported

- **Story Details**: Title, description, public status, moderation status
- **Seasons**: All seasons with their metadata and 3D models
- **Episodes**: All episodes with covers, summaries, and camera settings
- **Characters**: Character information, personalities, and POVs
- **Dialogues**: All dialogue text with camera orbits, targets, and shot types
- **Scenes**: Scene information and intersections
- **File Data**: Images, 3D models (GLTF/GLB, USDZ) - optional
- **Analytics**: View counts and timestamps - optional

### 🎯 Data Structure

The export creates a JSON file with this structure:

```json
{
  "metadata": {
    "export_version": "1.0",
    "export_timestamp": "2024-01-15T10:30:00Z",
    "app_name": "icvybz"
  },
  "story": {
    "title": "My Amazing Story",
    "description": "A 3D comic adventure",
    "is_public": true,
    "moderation_status": "approved",
    "created_at": "2024-01-01T00:00:00Z",
    "updated_at": "2024-01-15T10:30:00Z"
  },
  "seasons": [
    {
      "season_number": 1,
      "title": "The Beginning",
      "description": "Our story starts here",
      "release_date": "2024-01-15",
      "episodes": [
        {
          "episode_number": 1,
          "title": "First Episode",
          "description": "The adventure begins",
          "is_published": true,
          "summary": "What happened in this episode",
          "summary_camera_orbit": "0deg 75deg 5m",
          "summary_field_of_view": 60.0,
          "dialogues": [
            {
              "text": "Hello, world!",
              "order": 1,
              "scene_title": "Opening Scene",
              "scene_description": "The main character speaks",
              "shot_type": "mediumShot",
              "camera_orbit": "0deg 75deg 3m",
              "camera_target": "0m 1.6m 0m",
              "field_of_view": 45.0,
              "zoom_speed": 1.0,
              "rotation": "0deg 0deg 0deg",
              "character_name": "Nel",
              "character_head_x": 0.0,
              "character_head_y": 1.6,
              "character_head_z": 0.0,
              "character_default_camera_target": "0m 1.6m 0m"
            }
          ]
        }
      ]
    }
  ],
  "characters": [
    {
      "name": "Nel",
      "personality": "Brave",
      "love_interest": "Sam",
      "bio": "The main protagonist",
      "is_public": true,
      "created_at": "2024-01-01T00:00:00Z",
      "updated_at": "2024-01-15T10:30:00Z"
    }
  ]
}
```

## Usage Methods

### 1. Web Interface

**Access**: Go to your dashboard and click "Export/Import" button

**Export Process**:
1. Select the story you want to export
2. Choose whether to include file data (images, 3D models)
3. Choose whether to include analytics data (view counts)
4. Click "Export Story"
5. Download the generated JSON file

**Import Process**:
1. Select a JSON file exported from another app
2. Choose whether to skip file data for faster import
3. Click "Import Story"
4. View your imported story

### 2. Management Commands

**Export Command**:
```bash
python manage.py export_story <story_id> [options]
```

Options:
- `--output, -o`: Output file path (default: story_export.json)
- `--include-files`: Include file data (base64 encoded)
- `--include-analytics`: Include analytics data

Examples:
```bash
# Basic export
python manage.py export_story 1

# Export with files
python manage.py export_story 1 --include-files --output my_story.json

# Export with analytics
python manage.py export_story 1 --include-analytics
```

**Import Command**:
```bash
python manage.py import_story <input_file> [options]
```

Options:
- `--user-id`: User ID to assign the imported story to
- `--username`: Username to assign the imported story to
- `--dry-run`: Show what would be imported without actually importing
- `--skip-files`: Skip importing file data

Examples:
```bash
# Basic import
python manage.py import_story story_export.json

# Import for specific user
python manage.py import_story story_export.json --username john_doe

# Dry run to preview
python manage.py import_story story_export.json --dry-run

# Skip files for faster import
python manage.py import_story story_export.json --skip-files
```

### 3. API Endpoints

**Export API**:
```http
GET /immersivecomics/api/story/{story_id}/export/
```

Response:
```json
{
  "success": true,
  "data": {
    // Story data as shown above
  }
}
```

**Import API**:
```http
POST /immersivecomics/api/story/import/
Content-Type: application/json

{
  // Story data as shown above
}
```

Response:
```json
{
  "success": true,
  "story_id": 123,
  "message": "Successfully imported story \"My Amazing Story\""
}
```

## File Handling

### File Data Options

**Include Files**: When enabled, all file data (images, 3D models) is base64 encoded and included in the JSON export. This creates larger files but ensures complete data transfer.

**Skip Files**: When enabled during import, file fields are ignored. This is useful for faster imports when you only need the story structure and text content.

### Supported File Types

- **Images**: JPG, PNG, GIF (comic covers, episode covers)
- **3D Models**: GLTF, GLB, USDZ (season models, character models, intersections)

### File Size Considerations

- **GLTF/GLB**: Maximum 50MB per file
- **USDZ**: Maximum 25MB per file
- **Images**: Standard web formats, typically < 5MB

## Best Practices

- Export only the stories you need.
- Include files only when the receiving app needs a fully portable copy.
- Keep export files private; they can contain story content and media.
- Preview imports before relying on the imported copy.
- Verify story order, characters, and dialogue after import.

## Troubleshooting

- If an import fails, confirm the file is valid JSON and was created by this app.
- If media is missing, retry with file inclusion enabled or re-upload media manually.
- If imported dialogue or characters look wrong, review the original story setup before importing again.



