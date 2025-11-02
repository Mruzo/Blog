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

### Export Best Practices

1. **Regular Backups**: Export your stories regularly as backups
2. **File Inclusion**: Include files only when necessary (creates larger exports)
3. **Analytics**: Include analytics only for data migration purposes
4. **Naming**: Use descriptive filenames with story titles and dates

### Import Best Practices

1. **Dry Run**: Always use `--dry-run` first to preview what will be imported
2. **User Assignment**: Specify the target user for imported stories
3. **File Handling**: Skip files for faster imports when file data isn't needed
4. **Validation**: Check imported stories for completeness

### Data Integrity

1. **Character Mapping**: Characters are matched by name, so ensure consistent naming
2. **POV Creation**: POVs are automatically created for characters during import
3. **Order Preservation**: Dialogue and episode order is maintained
4. **Relationship Integrity**: All relationships between objects are preserved

## Troubleshooting

### Common Issues

**Import Fails with "Character not found"**:
- Ensure character names match exactly between export and import
- Check that characters exist in the target app

**Large File Imports**:
- Use `--skip-files` option for faster imports
- Consider file size limits in your Django settings

**Permission Errors**:
- Ensure the target user has permission to create stories
- Check file upload permissions in Django settings

**JSON Parse Errors**:
- Validate JSON file format before import
- Check for file corruption during transfer

### Error Messages

- `Story not found`: The specified story ID doesn't exist or isn't accessible
- `Invalid JSON data`: The import file is not valid JSON
- `Character not found`: A character referenced in dialogues doesn't exist
- `Permission denied`: User doesn't have permission to perform the operation

## Security Considerations

1. **Authentication**: All operations require user authentication
2. **User Isolation**: Users can only export/import their own stories
3. **File Validation**: File uploads are validated for type and size
4. **CSRF Protection**: Web interface is protected against CSRF attacks

## Migration Scenarios

### App-to-App Migration
1. Export stories from source app
2. Transfer JSON files to target app
3. Import stories into target app
4. Verify data integrity

### Backup and Restore
1. Regular exports as backup files
2. Store backups in secure location
3. Test restore process periodically

### Development to Production
1. Export from development environment
2. Import into production environment
3. Update file paths and URLs as needed

## Technical Details

### Database Models Involved

- `Comic` (Story)
- `Season`
- `Episode`
- `Character`
- `POV` (Point of View)
- `Dialogue`
- `Scene`
- `Intersection`

### File Storage

- Files are stored in Django's media directory
- File paths are preserved during export/import
- Base64 encoding is used for file data inclusion

### Performance Considerations

- Large exports with files can be slow
- Import performance depends on data size
- Use `--skip-files` for faster operations
- Consider database indexing for large datasets

## Support

For issues or questions about the export/import system:

1. Check this documentation first
2. Review error messages carefully
3. Test with small datasets first
4. Use dry-run mode for troubleshooting
5. Check Django logs for detailed error information



