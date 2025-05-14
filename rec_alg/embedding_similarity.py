import os
import glob
import numpy as np
from tqdm import tqdm

root_dir = os.path.dirname(os.path.abspath(__file__)) # alice/rec_alg
emb_dir = os.path.join(root_dir, "embeddings")

def load_embedding(topic, idx):
    path = os.path.join(emb_dir, f"{topic}{idx}_*.npy")
    matches = glob.glob(path)
    if not matches:
        raise FileNotFoundError(f"No embeddings found for topic {topic} with index {idx}.")

    return np.load(matches[0])

def cosine_similarity(v1, v2):
    dot_prod = np.dot(v1, v2)
    norm_v1 = np.linalg.norm(v1)
    norm_v2 = np.linalg.norm(v2)
    if norm_v1 == 0 or norm_v2 == 0:
        return 0
    
    return dot_prod / (norm_v1 * norm_v2)

topic1 = "nlp"
topic2 = "nlp"
idx1 = 2
idx2 = 4
emb1 = load_embedding(topic1, idx1)
emb2 = load_embedding(topic2, idx2)

cos_sim = cosine_similarity(emb1, emb2)
print(f"Cosine Similarity between {topic1}{idx1} and {topic2}{idx2}: {cos_sim}")