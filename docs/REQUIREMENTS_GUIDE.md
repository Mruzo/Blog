# Requirements Files Guide

This document explains the different requirements files in the project and how to use them.

## Requirements Files Overview

### `requirements.txt`
**Production dependencies** - Core packages needed to run the application in production.

**Installation:**
```bash
pip install -r requirements.txt
```

**Categories:**
- **Django and Core Web Framework** - Django, ASGI, SQL parsing
- **Database** - PostgreSQL drivers and database URL handling
- **Forms and UI** - Crispy forms, Bootstrap, SVG support
- **Content Management** - TinyMCE editor, meta tags
- **File Storage and Media** - Image processing, static files
- **Data Analysis and Visualization** - NumPy, Matplotlib, Folium maps
- **Natural Language Processing** - NLTK, TextBlob
- **AWS and Cloud Services** - S3 storage, AWS SDK
- **HTTP and API** - Requests, HTTP libraries
- **OAuth and Social Media** - Twitter API, OAuth
- **Development and Code Quality** - Pylint, code formatting
- **Utilities** - Environment variables, date handling
- **Text Processing** - Character encoding, text utilities
- **Web Server** - Gunicorn for production
- **UI and Styling** - Click, styling libraries
- **Documentation and Configuration** - Jinja2, configuration tools
- **Security and Certificates** - SSL certificates

### `requirements-dev.txt`
**Development dependencies** - Additional packages for development, testing, and debugging.

**Installation:**
```bash
pip install -r requirements-dev.txt
```

**Includes:**
- All production requirements (`-r requirements.txt`)
- **Development Tools** - Code formatting (autopep8, black, flake8)
- **Testing** - Pytest, Django testing, coverage
- **Debugging** - IPython, Django debug toolbar
- **Documentation** - Sphinx documentation generator
- **Virtual Environment** - Virtual environment management

## Version Management

### Production (`requirements.txt`)
- **Fixed versions** (`==`) for stability
- **Exact versions** to ensure reproducible builds
- **Tested combinations** that work together

### Development (`requirements-dev.txt`)
- **Fixed versions** for consistency
- **Development tools** not needed in production
- **Testing frameworks** for code quality

## Best Practices

### Installing Dependencies
```bash
# For production
pip install -r requirements.txt

# For development (includes production + dev tools)
pip install -r requirements-dev.txt
```

### Updating Dependencies
```bash
# Update a specific package
pip install --upgrade package-name

# Update requirements file
pip freeze > requirements.txt

# Update development requirements
pip freeze > requirements-dev.txt
```

### Virtual Environment
```bash
# Create virtual environment
python -m venv venv

# Activate virtual environment
source venv/bin/activate  # Linux/Mac
venv\Scripts\activate     # Windows

# Install dependencies
pip install -r requirements-dev.txt
```

## Dependency Categories

### Core Dependencies (Always Required)
- Django and web framework components
- Database drivers
- File storage and media handling

### Feature Dependencies (Conditional)
- **Data Analysis** - Only if using analytics features
- **Social Media** - Only if using Twitter integration
- **AWS Services** - Only if using S3 storage

### Development Dependencies (Development Only)
- Code formatting and linting tools
- Testing frameworks
- Debugging tools

## Troubleshooting

### Common Issues

1. **Version Conflicts**
   ```bash
   pip install --upgrade pip
   pip install -r requirements.txt --force-reinstall
   ```

2. **Missing Dependencies**
   ```bash
   pip install package-name
   pip freeze > requirements.txt
   ```

3. **Development Tools Not Working**
   ```bash
   pip install -r requirements-dev.txt
   ```

### Environment-Specific Issues

- **PostgreSQL Issues**: Ensure `psycopg2` or `psycopg2-binary` is installed
- **Image Processing**: Ensure `Pillow` is installed for image handling
- **AWS Issues**: Ensure `boto3` and related packages are installed

## Security Notes

- **Production**: Use exact versions to prevent security vulnerabilities
- **Development**: Can use newer versions for testing
- **Regular Updates**: Update dependencies regularly for security patches
- **Vulnerability Scanning**: Use tools like `safety` to check for vulnerabilities

## Migration Guide

When updating Django or major dependencies:

1. **Backup current requirements**
   ```bash
   cp requirements.txt requirements.txt.backup
   ```

2. **Update Django**
   ```bash
   pip install --upgrade Django
   ```

3. **Update other dependencies**
   ```bash
   pip install --upgrade -r requirements.txt
   ```

4. **Test thoroughly**
   ```bash
   python manage.py test
   ```

5. **Update requirements files**
   ```bash
   pip freeze > requirements.txt
   ```
