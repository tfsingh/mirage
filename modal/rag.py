import modal
from typing import Dict
from modal import gpu, build, enter, exit, web_endpoint, Secret, Dict, method
from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials

GPU_CONFIG = gpu.A10G()

img = modal.Image.debian_slim().apt_install("git").pip_install("ragatouille", "nltk", "sentence_transformers", "voyager")

stub = modal.Stub("flora-rag")
stub.index_store = Dict.new()
auth_scheme = HTTPBearer() 

# after rag should be able to use a base model fine tuned on some other data

@stub.cls(
    image=img,
    secrets=[Secret.from_name("flora-token")],
    timeout=60
)
class Retriever:
    @enter()
    def setup(self):
        from sentence_transformers import SentenceTransformer
        from voyager import Index, Space

        self.embedder = SentenceTransformer("BAAI/bge-small-en-v1.5")
        self.collection_map = {}
        self.index = Index(
            Space.Cosine,
            num_dimensions=self.embedder.get_sentence_embedding_dimension(),
        )

    @method()
    def index_documents(self, documents):
        for document in documents:
            self.collection_map[self.index.add_item(self.embedder.encode(document))] = document
        print(self.collection_map)

    @method()
    def query(self, query, k = 10):
        query_embedding = self.embedder.encode(query)
        to_return = []
        for idx in self.index.query(query_embedding, k=k)[0]:
            to_return.append(self.collection_map[idx])
        return to_return

@stub.cls(
    gpu=GPU_CONFIG,
    image=img,
    secrets=[Secret.from_name("flora-token")],
    timeout=80
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

    @method()
    def rag(self, item: Dict):
                # write data to modal volume/cache with user id

        #import os

        # if token.credentials != os.environ["AUTH_TOKEN"]:
        #     raise HTTPException(
        #         status_code=status.HTTP_401_UNAUTHORIZED,
        #         detail="Incorrect bearer token",
        #         headers={"WWW-Authenticate": "Bearer"},
        # )

        # receive (user id, sha256 hash)
        # store index in modal dict

        from langchain_text_splitters import NLTKTextSplitter


        text_splitter = NLTKTextSplitter(chunk_size=256)
        docs = item['data'] if item['chunked'] else text_splitter.split_text(item['data'])
        k = min(item['k'], len(docs))
        retriever = Retriever()
        retriever.index_documents.remote(docs)
        initial_results = retriever.query.remote(item['query'], k=k)
        search_results = self.model.rerank(
            query=item['query'], documents=initial_results, k=k
        )

        return [result["content"] for result in search_results]
    


@stub.local_entrypoint()
def main():
    example_data = [
	"Use modal run stub_module.py --help for more information on usage.\\nDecorator to register a new Modal function with this stub.\\nSandboxes are a way to run arbitrary commands in dynamically defined environments.\\nThis function returns a SandboxHandle, which can be used to interact with the running sandbox.\\nRefer to the docs on how to spawn and use sandboxes.\\nclass Stub(object)\\nStub\\nFunction\\nImage\\nSecret\\n@stub.function()\\nimport modal\\n\\nstub = modal.Stub()\\n\\n@stub.function(\\n    secrets=[modal.Secret.from_name(\\\"some_secret\\\")],\\n    schedule=modal.Period(days=1),\\n)\\ndef foo():\\n    pass\\n@typechecked\\ndef __init__(\\n    self,\\n    name: Optional[str] = None,\\n    *,\\n    image: Optional[_Image] = None,  # default image for all functions (default is `modal.Image.debian_slim()`)\\n    mounts: Sequence[_Mount] = [],  # default mounts for all functions\\n    secrets: Sequence[_Secret] = [],  # default secrets for all functions\\n    volumes: Dict[Union[str, PurePosixPath], _Volume] = {},  # default volumes for all functions\\n    **indexed_objects: _Object,  # any Modal Object dependencies (Dict, Queue, etc.",
	"Modal facilitates this through function schedules.\\nLet’s say we have a Python module heavy.py with a function, perform_heavy_computation().\\nTo schedule this function to run once per day, we create a Modal Stub and attach our function to it with the @stub.function decorator and a schedule parameter:\\nTo activate the schedule, deploy your app, either through the CLI:\\nOr programmatically:\\nWhen you make changes to your function, just rerun the deploy command to overwrite the old deployment.\\nNote that when you redeploy your function, modal.Period resets, and the schedule will run X hours after this most recent deployment.\\nIf you want to run your function at a regular schedule not disturbed by deploys, modal.Cron (see below) is a better option.\\nTo see past execution logs for the scheduled function, go to the Apps section on the Modal web site.\\nSchedules currently cannot be paused.",
	"We can put it all together in another Modal function, and add a schedule argument so it runs every day automatically:\\nThis entire stub can now be deployed using modal deploy db_to_sheet.py."]
    model = RAG()
    print(
        model.rag.remote(
            {"query": "modal schedule", "data": example_data, "k": 3, "chunked" : True}
        )
    )