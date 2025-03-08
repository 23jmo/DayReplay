from fastapi import FastAPI, UploadFile, File
#import faiss
import chromadb
import numpy as np
import openai
from PIL import Image
import io
import os
from pydantic import BaseModel
from fastapi.middleware.cors import CORSMiddleware

app = FastAPI()

# Add CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # Allows all origins
    allow_credentials=True,
    allow_methods=["*"],  # Allows all methods
    allow_headers=["*"],  # Allows all headers
)

# Load FAISS index (for vector search)

chroma_client = chromadb.PersistentClient(path="./db")
collection = chroma_client.get_or_create_collection(name="timelapse") # Adjust dimensions based on embedding model

# OpenAI API Key (Set this in your environment variables for security)
OPENAI_API_KEY = os.getenv("OPENAI_API_KEY")
openai.api_key = OPENAI_API_KEY

class APIKey(BaseModel):
    key: str

@app.post("/set-api-key")
async def set_api_key(api_key: APIKey):
    """Updates the OpenAI API key."""
    global OPENAI_API_KEY
    OPENAI_API_KEY = api_key.key
    openai.api_key = OPENAI_API_KEY
    os.environ["OPENAI_API_KEY"] = OPENAI_API_KEY
    return {"message": "API key updated successfully"}

def get_text_embedding(text: str):
    """Generate an embedding from text using OpenAI."""
    response = openai.Embedding.create(
        input=text,
        model="text-embedding-ada-002"
    )
    return response["data"][0]["embedding"]

@app.post("/upload")
async def upload_log(timestamp: str, app_name: str, description: str):
    """Store an activity log with its embedding."""
    text = f"{timestamp} - {app_name} - {description}"
    embedding = get_text_embedding(text)

    collection.add(
        ids=[timestamp],  # Using timestamp as unique ID
        embeddings=[embedding],
        metadatas=[{"timestamp": timestamp, "app": app_name, "description": description}]
    )
    return {"message": "Activity logged successfully"}

@app.post("/search")
async def search_logs(query: str):
    """Find similar past activities."""
    query_embedding = get_text_embedding(query)
    results = collection.query(
        query_embeddings=[query_embedding], n_results=5
    )
    return {"matches": results["documents"]}
