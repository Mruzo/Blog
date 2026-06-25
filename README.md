# Justvybz - Immersive Storytelling Platform

Justvybz is a platform for creating and experiencing immersive 3D comic stories with interactive dialogue, dynamic camera controls, collaboration tools, and optional commerce features.

## Features

- Immersive 3D storytelling with camera-controlled comic scenes
- Studio and collaboration tools for creators
- Episode, dialogue, character, and season management
- Optional commerce features
- Public story discovery, comments, views, and sharing

## Documentation

Project documentation is organized in [`docs/`](./docs/):

- [Documentation Index](./docs/README.md)
- [Deployment Overview](./docs/deployment/PRODUCTION_DEPLOYMENT.md)
- [Local Development Note](./docs/development/RUN_APP_FROM_HERE.md)
- [Testing Docs](./docs/testing/)
- [User Guides](./docs/guides/)

## Technology Stack

- Backend: Django, Django REST Framework
- Frontend: React, TypeScript
- Database-backed application with object/file storage
- Hosted payment and shipping integrations

## Security & Compliance

The app uses hosted payment flows and includes privacy/data-management features such as data export and deletion.

## Project Structure

```text
.
├── docs/              # Project documentation
├── vybzapp/
│   ├── frontend/      # React frontend application
│   ├── snmov/         # Commerce app
│   ├── icvybz/        # Immersive comics app
│   └── templates/     # Django templates
└── README.md
```

## Getting Started

1. Clone the repository.
2. Set up a virtual environment: `python -m venv vybzenv`.
3. Install backend dependencies: `pip install -r requirements.txt`.
4. Configure local settings in `vybzapp/snm/settings/local.py`.
5. Run migrations: `python vybzapp/manage.py migrate`.
6. Start Django: `python vybzapp/manage.py runserver`.
7. Start the frontend from this repo: `cd vybzapp/frontend && npm start`.

See [Run App From Here](./docs/development/RUN_APP_FROM_HERE.md) for the canonical local frontend path.

## License

Copyright (c) 2025 Justvybz Inc. All rights reserved.

This is a private repository. For questions or access, contact the development team.
