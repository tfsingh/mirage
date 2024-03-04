import modal
from typing import Dict
from modal import gpu, build, enter, exit, web_endpoint

GPU_CONFIG = gpu.A10G()

img = modal.Image.debian_slim().apt_install("git").pip_install("ragatouille", "nltk")

stub = modal.Stub("flora-rag")

@stub.cls(
    gpu=GPU_CONFIG,
    image=img,
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

    @web_endpoint()
    def rag(self, item: Dict):
        from langchain_text_splitters import NLTKTextSplitter
        text_splitter = NLTKTextSplitter(chunk_size=256)
        doc_contents = text_splitter.split_text(item['data'])
        k = min(item['k'], len(doc_contents))
        search_results = self.model.rerank(
            query=item['query'], documents=doc_contents, k=k
        )
        return [result["content"] for result in search_results]