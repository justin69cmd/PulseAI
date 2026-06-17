from ml_engine import classify_symptoms, summarize_report, detect_anomalies
from flask import Flask, request, jsonify
from flask_cors import CORS
import os
import chromadb
import hashlib
from groq import Groq
from tavily import TavilyClient
from langchain_community.document_loaders import PyPDFLoader
from langchain_text_splitters import RecursiveCharacterTextSplitter
import warnings
warnings.filterwarnings("ignore")

app = Flask(__name__)
CORS(app)  # allows React to talk to Flask

# ── API Keys ──────────────────────────────────────
GROQ_API_KEY   = "GROQ_API_KEY"
TAVILY_API_KEY = "TAVILY_API_KEY"
PDF_FOLDER     = r"C:\Users\Justin.Intern\Desktop\MedicalData"

# ── Clients ───────────────────────────────────────
groq_client   = Groq(api_key=GROQ_API_KEY)
tavily_client = TavilyClient(api_key=TAVILY_API_KEY)

# ── ChromaDB Setup ────────────────────────────────
chroma_client = chromadb.Client()
collection    = None  # loaded on startup

# ── Embedding (no download needed) ────────────────
def simple_embed(texts):
    embeddings = []
    for text in texts:
        hash_val = hashlib.md5(text.encode()).hexdigest()
        embedding = []
        for i in range(0, min(len(hash_val)*2, 96), 2):
            seed = int(hash_val[i % len(hash_val)], 16)
            for j in range(4):
                embedding.append(((seed * (j+1) * (i+1)) % 100) / 100.0)
        while len(embedding) < 384:
            embedding.append(0.0)
        embeddings.append(embedding[:384])
    return embeddings

# ── Load PDFs on startup ──────────────────────────
def load_documents():
    global collection
    print("📂 Loading documents...")

    try:
        chroma_client.delete_collection("medical_docs")
    except:
        pass

    collection = chroma_client.get_or_create_collection("medical_docs")

    pdf_files = [f for f in os.listdir(PDF_FOLDER) if f.endswith(".pdf")]
    all_chunks = []

    for pdf in pdf_files:
        path = os.path.join(PDF_FOLDER, pdf)
        loader = PyPDFLoader(path)
        docs = loader.load()
        splitter = RecursiveCharacterTextSplitter(chunk_size=500, chunk_overlap=50)
        chunks = splitter.split_documents(docs)
        all_chunks.extend(chunks)
        print(f"✅ Loaded {pdf} ({len(chunks)} chunks)")

    texts = [c.page_content for c in all_chunks]
    embeddings = simple_embed(texts)

    collection.add(
        documents=texts,
        embeddings=embeddings,
        ids=[f"chunk_{i}" for i in range(len(texts))]
    )
    print(f"✅ {len(texts)} chunks indexed in ChromaDB")
    return pdf_files

# ── Smart Router ──────────────────────────────────
def should_search_web(question):
    response = groq_client.chat.completions.create(
        model="llama-3.3-70b-versatile",
        max_tokens=5,
        messages=[
            {"role": "system", "content": """Reply ONLY with YES or NO.
            YES if question needs live web search:
            - Latest/recent/new treatments or drugs
            - Current statistics or outbreaks  
            - WHO/FDA/CDC guidelines
            NO if question is about uploaded documents:
            - Summarize my report
            - What does the document say
            - Patient specific data"""},
            {"role": "user", "content": question}
        ]
    )
    return "YES" in response.choices[0].message.content.upper()

# ── Web Search ────────────────────────────────────
def web_search(query):
    results = tavily_client.search(
        query=query,
        search_depth="advanced",
        max_results=3,
        include_domains=[
            "pubmed.ncbi.nlm.nih.gov",
            "who.int",
            "mayoclinic.org",
            "webmd.com",
            "medlineplus.gov"
        ]
    )
    return "\n".join([r["content"] for r in results["results"]])

# ══════════════════════════════════════════════════
# API ROUTES
# ══════════════════════════════════════════════════

# ── Health check ──────────────────────────────────
@app.route("/api/health", methods=["GET"])
def health():
    return jsonify({ "status": "ok", "docs_loaded": collection is not None })

# ── Get loaded files ──────────────────────────────
@app.route("/api/files", methods=["GET"])
def get_files():
    try:
        files = [f for f in os.listdir(PDF_FOLDER) if f.endswith(".pdf")]
        return jsonify({ "files": files })
    except Exception as e:
        return jsonify({ "error": str(e) }), 500

# ── Ask question ──────────────────────────────────
@app.route("/api/ask", methods=["POST"])
def ask():
    data = request.json
    question = data.get("question", "").strip()

    if not question:
        return jsonify({"error": "No question provided"}), 400

    try:
        # Auto-detect ML task
        q_lower = question.lower()

        # Auto-route to symptom classifier
        symptom_keywords = ["symptom", "feeling", "experiencing", "i have", "suffering", "pain", "fever", "cough"]
        if any(k in q_lower for k in symptom_keywords):
            ml_result = classify_symptoms(question)
            return jsonify({
                "answer": format_symptom_response(ml_result),
                "web_used": False,
                "source": "ML Symptom Classifier",
                "ml_data": ml_result,
                "ml_type": "symptom_classifier"
            })

        # Auto-route to anomaly detector
        anomaly_keywords = ["abnormal", "anomaly", "flag", "check values", "lab results", "blood test"]
        if any(k in q_lower for k in anomaly_keywords):
            query_embedding = simple_embed([question])
            results = collection.query(query_embeddings=query_embedding, n_results=5)
            doc_text = "\n".join(results["documents"][0])
            ml_result = detect_anomalies(doc_text)
            return jsonify({
                "answer": format_anomaly_response(ml_result),
                "web_used": False,
                "source": "ML Anomaly Detector",
                "ml_data": ml_result,
                "ml_type": "anomaly_detector"
            })

        # Default RAG flow
        query_embedding = simple_embed([question])
        results = collection.query(query_embeddings=query_embedding, n_results=3)
        local_context = "\n".join(results["documents"][0])

        needs_web = should_search_web(question)
        web_context = web_search(question) if needs_web else ""
        combined = f"FROM DOCUMENTS:\n{local_context}\n\nFROM WEB:\n{web_context}" if needs_web else f"FROM DOCUMENTS:\n{local_context}"

        response = groq_client.chat.completions.create(
            model="llama-3.3-70b-versatile",
            messages=[
                {"role": "system", "content": f"You are PulseAI. Answer based on context:\n{combined}"},
                {"role": "user", "content": question}
            ]
        )

        return jsonify({
            "answer": response.choices[0].message.content,
            "web_used": needs_web,
            "source": "documents + live web" if needs_web else "your documents",
            "ml_type": "rag"
        })

    except Exception as e:
        return jsonify({"error": str(e)}), 500


def format_symptom_response(result):
    if "error" in result:
        return f"⚠️ {result['error']}"
    lines = ["**🔍 Symptom Analysis Results**\n"]
    lines.append(f"**Urgency Level: {result.get('urgency', 'N/A')}**")
    lines.append(f"{result.get('urgency_reason', '')}\n")
    lines.append("**Possible Conditions:**")
    for c in result.get("conditions", []):
        lines.append(f"• {c['name']} — {c['probability']}% match\n  {c['description']}")
    lines.append(f"\n**Recommended Action:** {result.get('recommended_action', '')}")
    if result.get("red_flags"):
        lines.append(f"\n**⚠️ Red Flags:** {', '.join(result['red_flags'])}")
    return "\n".join(lines)


def format_anomaly_response(result):
    if "error" in result:
        return f"⚠️ {result['error']}"
    lines = [f"**⚠️ Anomaly Detection Report**\n"]
    lines.append(f"**Risk Level: {result.get('risk_level', 'N/A')}**")
    lines.append(f"Found {result.get('total_anomalies', 0)} abnormal values\n")
    if result.get("anomalies"):
        lines.append("**Abnormal Values:**")
        for a in result["anomalies"]:
            lines.append(f"• {a['test']}: {a['value']} {a['unit']} {a['status']}")
            lines.append(f"  Reference: {a['reference']} | {a['difference']}")
    if result.get("normal_values"):
        lines.append(f"\n**Normal Values:** {', '.join([n['test'] for n in result['normal_values']])}")
    return "\n".join(lines)

# ── Reload documents ──────────────────────────────
@app.route("/api/reload", methods=["POST"])
def reload_docs():
    try:
        files = load_documents()
        return jsonify({ "success": True, "files": files })
    except Exception as e:
        return jsonify({ "error": str(e) }), 500

# ══════════════════════════════════════════════════
if __name__ == "__main__":
    load_documents()
    print("\n🚀 PulseAI backend running at http://localhost:5000\n")
    app.run(debug=True, port=5000)