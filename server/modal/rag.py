import modal
from typing import Dict
from modal import Image, gpu, build, enter, exit, web_endpoint, Secret, method
from fastapi import Depends, HTTPException, status, Query
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials

GPU_CONFIG = gpu.Any()

#img = Image.from_registry("nvidia/cuda:11.8.0-cudnn8-devel-ubuntu22.04",
#add_python="3.10").apt_install("git").pip_install("ragatouille", "nltk") (used if we'd like to index instead)
img = modal.Image.debian_slim().apt_install("git").pip_install("ragatouille", "nltk", "pympler")

stub = modal.Stub("mirage-rag")

auth_scheme = HTTPBearer()

volume = modal.Volume.from_name("mirage-rag-user-data")

@stub.cls(
    gpu=GPU_CONFIG,
    image=img,
    secrets=[Secret.from_name("mirage-token")],
    timeout=40,
    volumes={"/data": volume}
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
        import json
        from pympler import asizeof

        if token.credentials != os.environ["AUTH_TOKEN"]:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Incorrect bearer token",
                headers={"WWW-Authenticate": "Bearer"},
            )

        from langchain_text_splitters import NLTKTextSplitter

        data = item['data']
        user_id = item['user_id']
        model_id = item['model_id']

        data_size = asizeof.asizeof(data)

        if data_size < 500 and not item['inference']:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Size of data too small, check url",
                headers={"WWW-Authenticate": "Bearer"},
            )

        if asizeof.asizeof(data) > 1_500_000:
            raise HTTPException(
                status_code=status.HTTP_413_REQUEST_ENTITY_TOO_LARGE,
                detail="Size of data exceeds limit (~1.5 mb)",
                headers={"WWW-Authenticate": "Bearer"},
            )

        text_splitter = NLTKTextSplitter(chunk_size=256)

        if not item['inference'] and item['chunk_pages']:
            data = [text for item in data for text in text_splitter.split_text(item)]

        file_path = f"/data/{user_id}-{model_id}.json"
        volume.reload()

        docs = []

        if os.path.exists(file_path):
            with open(file_path, 'r') as file:
                docs = json.load(file)
        else:
            with open(file_path, 'w') as file:
                json.dump(data, file)
            docs = data
            volume.commit()
            return "Stored data"


        if not docs:
            raise HTTPException(
                status_code=status.HTTP_204_NO_CONTENT,
                detail="Issue loading data",
                headers={"WWW-Authenticate": "Bearer"},
            )

        k = min(5, len(docs))

        search_results = self.model.rerank(
            query=item['query'], documents=docs, k=k
        )

        #print(search_results)

        return [result["content"] for result in search_results]

@stub.function(volumes={"/data": volume}, secrets=[Secret.from_name("mirage-token")])
@web_endpoint(method="GET")
def get_data(
    model_id: str = Query(...),
    user_id: str = Query(...),
    token: HTTPAuthorizationCredentials = Depends(auth_scheme),
):
    import os
    import json

    if token.credentials != os.environ["AUTH_TOKEN"]:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect bearer token",
            headers={"WWW-Authenticate": "Bearer"},
        )

    volume.reload()
    file_path = f"/data/{user_id}-{model_id}.json"
    print(file_path)
    if os.path.exists(file_path):
        with open(file_path, 'r') as file:
            return json.load(file)

    raise HTTPException(
        status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
        detail="Issue loading data",
        headers={"WWW-Authenticate": "Bearer"},
    )