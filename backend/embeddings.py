import os

import numpy as np
import onnxruntime as ort
from chromadb.api.types import Documents, EmbeddingFunction, Embeddings, Space
from tokenizers import Tokenizer

# Directory containing the ONNX model and tokenizer. This can be set via the EMBEDDING_MODEL_DIR environment variable. Defaults to "/opt/e5-small" if not set. Necessary for the E5 embedding function to locate its resources.
MODEL_DIR = os.environ.get("EMBEDDING_MODEL_DIR", "/opt/e5-small")

# E5 is trained on asymmetric pairs, which means stored text is a "passage" and the thing being searched for is a "query".
PASSAGE_PREFIX = "passage: "
QUERY_PREFIX = "query: "

# Maximum number of tokens the model can handle. Longer sequences are truncated.
MAX_TOKENS = 512

# Number of documents to embed in a single batch. Adjust based on available memory and performance considerations.
EMBED_BATCH = 16


class E5EmbeddingFunction(EmbeddingFunction[Documents]):
    """multilingual-e5-small over onnxruntime.

    Supports multilingual embeddings for text passages and queries. No translation is required for different languages.
    """

    def __init__(self, model_dir: str = MODEL_DIR):
        self._model_dir = model_dir
        self._tokenizer = Tokenizer.from_file(os.path.join(model_dir, "tokenizer.json"))
        self._tokenizer.enable_truncation(max_length=MAX_TOKENS)
        pad_id = self._tokenizer.token_to_id("<pad>")
        self._tokenizer.enable_padding(
            pad_id=0 if pad_id is None else pad_id,
            pad_token="<pad>" if pad_id is not None else "[PAD]",
        )
        self._session = ort.InferenceSession(
            os.path.join(model_dir, "model.onnx"),
            providers=["CPUExecutionProvider"],
        )
        # Determine the input names from the ONNX model to know if token_type_ids are required.
        self._input_names = {i.name for i in self._session.get_inputs()}

    @staticmethod
    def name() -> str:
        return "e5_small_onnx"

    def default_space(self) -> Space:
        # The default space for the embeddings is L2, which is consistent with Chroma's default.
        return "l2"

    def get_config(self) -> dict:
        return {"model_dir": self._model_dir}

    @staticmethod
    def build_from_config(config: dict) -> "E5EmbeddingFunction":
        return E5EmbeddingFunction(model_dir=config.get("model_dir", MODEL_DIR))

    def _run(self, texts: list[str]) -> np.ndarray:
        encodings = self._tokenizer.encode_batch(texts)
        ids = np.array([e.ids for e in encodings], dtype=np.int64)
        mask = np.array([e.attention_mask for e in encodings], dtype=np.int64)

        feed = {"input_ids": ids, "attention_mask": mask}
        if "token_type_ids" in self._input_names:
            feed["token_type_ids"] = np.zeros_like(ids)

        last_hidden = self._session.run(None, feed)[0]

        # Mean pooling over the token embeddings, weighted by the attention mask, followed by L2 normalization.
        weights = mask[..., None].astype(np.float32)
        pooled = (last_hidden * weights).sum(axis=1) / np.clip(weights.sum(axis=1), 1e-9, None)
        return pooled / np.linalg.norm(pooled, axis=1, keepdims=True)

    def _embed(self, texts: list[str]) -> Embeddings:
        rows: list[np.ndarray] = []
        for start in range(0, len(texts), EMBED_BATCH):
            rows.extend(self._run(texts[start:start + EMBED_BATCH]).astype(np.float32))
        return rows

    def __call__(self, input: Documents) -> Embeddings:
        """Documents. Chroma routes add/upsert here."""
        return self._embed([f"{PASSAGE_PREFIX}{text}" for text in input])

    def embed_query(self, input: Documents) -> Embeddings:
        """Questions. Chroma routes query_texts here, which is what makes the passage/query
        asymmetry work without a single call site changing."""
        return self._embed([f"{QUERY_PREFIX}{text}" for text in input])