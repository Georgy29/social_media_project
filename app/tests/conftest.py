import os
from pathlib import Path

import pytest
from alembic import command
from alembic.config import Config
from fastapi.testclient import TestClient
from sqlalchemy import event
from sqlalchemy import create_engine
from sqlalchemy.engine import make_url
from sqlalchemy.orm import sessionmaker

def _default_test_database_url() -> str:
    database_url = os.getenv("DATABASE_URL")
    if database_url:
        try:
            url = make_url(database_url)
            return str(url.set(database="microblog_test"))
        except Exception:
            pass

    return "postgresql+psycopg://postgres:postgres@localhost:5432/microblog_test"


# Point tests to a dedicated DB.
TEST_DATABASE_URL = os.getenv("TEST_DATABASE_URL", _default_test_database_url())

# Important: set DATABASE_URL before importing app/settings
os.environ["DATABASE_URL"] = TEST_DATABASE_URL

from app.main import app  # noqa: E402
from app.database import get_db  # noqa: E402

engine = create_engine(TEST_DATABASE_URL)
TestingSessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)


@pytest.fixture(scope="session", autouse=True)
def apply_migrations():
    alembic_cfg = Config(str(Path(__file__).resolve().parents[2] / "alembic.ini"))
    command.upgrade(alembic_cfg, "head")
    yield


@pytest.fixture()
def db_session():
    connection = engine.connect()
    transaction = connection.begin()
    session = TestingSessionLocal(bind=connection)
    session.begin_nested()

    @event.listens_for(session, "after_transaction_end")
    def restart_savepoint(sess, trans):
        if (
            trans.nested and not trans._parent.nested
        ):  # might break tests in SQLite (good for Postgres)
            sess.begin_nested()

    try:
        yield session
    finally:
        session.close()
        transaction.rollback()
        connection.close()


@pytest.fixture()
def client(db_session):
    def override_get_db():
        yield db_session

    app.dependency_overrides[get_db] = override_get_db
    with TestClient(app) as c:
        yield c
    app.dependency_overrides.clear()
