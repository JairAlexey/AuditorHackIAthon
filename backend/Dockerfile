FROM python:3.12-slim

WORKDIR /app

# PyMuPDF 1.25+ incluye binarios MuPDF propios, no necesita libmupdf-dev
RUN pip install --no-cache-dir --upgrade pip

COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

COPY . .

EXPOSE 8000

CMD ["uvicorn", "main:app", "--host", "0.0.0.0", "--port", "8000"]
