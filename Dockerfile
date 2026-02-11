FROM python:3.12-slim

WORKDIR /code

ARG REQUIREMENTS_FILE=app/requirements-prod.txt
COPY app/requirements*.txt /code/app/
RUN pip install --no-cache-dir -r /code/${REQUIREMENTS_FILE}

COPY . /code
RUN pip install --no-cache-dir -e .

EXPOSE 8000
CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8000"]

