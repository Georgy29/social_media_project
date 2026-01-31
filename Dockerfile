FROM python:3.12-slim

WORKDIR /code

ARG REQUIREMENTS_FILE=app/requirements-prod.txt
COPY ${REQUIREMENTS_FILE} /code/app/requirements.txt
RUN pip install --no-cache-dir -r /code/app/requirements.txt

COPY . /code
RUN pip install --no-cache-dir -e .

EXPOSE 8000
CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8000"]

