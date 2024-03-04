import modal
from typing import Dict
from modal import gpu, build, enter, exit, web_endpoint, Secret
from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials

GPU_CONFIG = gpu.A10G()

img = modal.Image.debian_slim().apt_install("git").pip_install("ragatouille", "nltk")

stub = modal.Stub("flora-rag")
auth_scheme = HTTPBearer() 

@stub.cls(
    gpu=GPU_CONFIG,
    image=img,
    secrets=[Secret.from_name("flora-token")],
    timeout=20
)
class RAG:
    @build()
    def download_model(self):
        from ragatouille import RAGPretrainedModel

        RAGPretrainedModel.from_pretrained("colbert-ir/colbertv2.0", verbose=0)

    @enter()
    def setup(self):
        from ragatouille import RAGPretrainedModel

        self.model = RAGPretrainedModel.from_pretrained(
            "colbert-ir/colbertv2.0", verbose=0
        )

    @web_endpoint(method="POST")
    def rag(self, item: Dict, token: HTTPAuthorizationCredentials = Depends(auth_scheme)):
        import os

        if token.credentials != os.environ["AUTH_TOKEN"]:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Incorrect bearer token",
                headers={"WWW-Authenticate": "Bearer"},
        )

        from langchain_text_splitters import NLTKTextSplitter

        text_splitter = NLTKTextSplitter(chunk_size=256)
        doc_contents = text_splitter.split_text(item['data'])
        k = min(item['k'], len(doc_contents))
        search_results = self.model.rerank(
            query=item['query'], documents=doc_contents, k=k
        )

        return [result["content"] for result in search_results]