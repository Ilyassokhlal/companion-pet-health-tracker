FROM python:3.11-slim

WORKDIR /app

RUN apt-get update && apt-get install -y --no-install-recommends \
    build-essential \
    curl \
    && rm -rf /var/lib/apt/lists/*

# Download and set up the E5 embedding model. The model is pinned to a specific revision to ensure consistent embeddings. The build is fp16-oriented for optimal performance on the target CPU architecture.
ARG E5_REVISION=614241f622f53c4eeff9890bdc4f31cfecc418b3
ARG E5_BASE=https://huggingface.co/intfloat/multilingual-e5-small/resolve
RUN mkdir -p /opt/e5-small \
    && curl -fsSL -o /opt/e5-small/model.onnx "${E5_BASE}/${E5_REVISION}/onnx/model.onnx" \
    && curl -fsSL -o /opt/e5-small/tokenizer.json "${E5_BASE}/${E5_REVISION}/onnx/tokenizer.json"

COPY requirements.txt .

RUN pip install --no-cache-dir -r requirements.txt

COPY . .

EXPOSE 8000

CMD ["sh", "-c", "alembic upgrade head && uvicorn main:app --host 0.0.0.0 --port 8000"]
