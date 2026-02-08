# Services Layer

This folder contains reusable business/query logic extracted from routers.

## Modules

- `feed_query.py`: builds and filters feed/post query shapes.
- `post_mapper.py`: converts DB query rows into API response schemas.
- `post_write_service.py`: post write-path validation and ownership helpers.

## Boundaries

- Routers should orchestrate request/response flow and call services.
- Services should avoid FastAPI-specific request handling.
- Services may raise shared app exceptions from `app.exceptions`.

## Conventions

- Keep functions focused and side-effect aware.
- Prefer typed inputs/outputs for mapper and validation helpers.
- Add tests for behavior changes; pure refactors should keep tests green.
