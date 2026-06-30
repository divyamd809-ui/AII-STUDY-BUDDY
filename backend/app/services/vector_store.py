import os
import pypdf
from typing import List, Tuple, Dict, Any
from langchain_text_splitters import RecursiveCharacterTextSplitter
from langchain_community.vectorstores import FAISS
from langchain_google_genai import GoogleGenerativeAIEmbeddings, ChatGoogleGenerativeAI
from langchain_core.prompts import ChatPromptTemplate
from app.core.config import GEMINI_API_KEY, FAISS_INDEX_DIR

class VectorStoreService:
    def __init__(self):
        self.api_key = GEMINI_API_KEY
        if not self.api_key:
            import os
            self.api_key = os.getenv("GEMINI_API_KEY", "")
            
    def _get_embeddings(self) -> GoogleGenerativeAIEmbeddings:
        if not self.api_key:
            raise ValueError("GEMINI_API_KEY is not set. Cannot initialize embeddings.")
        return GoogleGenerativeAIEmbeddings(
            model="models/embedding-001",
            google_api_key=self.api_key
        )

    def extract_text_from_pdf(self, pdf_path: str) -> str:
        if not os.path.exists(pdf_path):
            raise FileNotFoundError(f"PDF file not found at: {pdf_path}")
            
        text = ""
        try:
            reader = pypdf.PdfReader(pdf_path)
            for page in reader.pages:
                page_text = page.extract_text()
                if page_text:
                    text += page_text + "\n"
        except Exception as e:
            raise RuntimeError(f"Error parsing PDF: {str(e)}")
            
        return text

    def create_index(self, note_id: int, text: str) -> str:
        """Splits text, generates embeddings, and saves a local FAISS index for this specific note."""
        if not text.strip():
            raise ValueError("Extracted text is empty. Cannot index.")
            
        # 1. Split text into chunks
        text_splitter = RecursiveCharacterTextSplitter(
            chunk_size=1000,
            chunk_overlap=200
        )
        chunks = text_splitter.split_text(text)
        
        if not chunks:
            raise ValueError("Text could not be split into chunks.")

        # 2. Embed chunks and index them in FAISS
        embeddings = self._get_embeddings()
        db = FAISS.from_texts(chunks, embeddings)
        
        # 3. Save index locally
        index_path = os.path.join(FAISS_INDEX_DIR, f"note_{note_id}")
        db.save_local(index_path)
        
        return index_path

    def chat_with_note(self, note_id: int, question: str) -> Tuple[str, List[str]]:
        """Loads the note FAISS index, retrieves context, and returns Gemini's answer with source chunks."""
        index_path = os.path.join(FAISS_INDEX_DIR, f"note_{note_id}")
        
        if not os.path.exists(index_path):
            raise FileNotFoundError(f"No study index found for Note ID {note_id}. Please upload/process notes first.")
            
        embeddings = self._get_embeddings()
        
        # Load local FAISS index
        db = FAISS.load_local(
            index_path, 
            embeddings, 
            allow_dangerous_deserialization=True
        )
        
        # Retrieve top 4 most relevant chunks
        docs = db.similarity_search(question, k=4)
        context_chunks = [doc.page_content for doc in docs]
        
        # Build prompt and query LLM
        context_text = "\n\n---\n\n".join(context_chunks)
        
        llm = ChatGoogleGenerativeAI(
            model="gemini-1.5-flash",
            google_api_key=self.api_key,
            temperature=0.3
        )
        
        prompt = ChatPromptTemplate.from_messages([
            ("system", (
                "You are an expert AI study tutor. Answer the student's question based strictly on the provided context "
                "from their notes. If the answer cannot be found in the context, use your general knowledge, "
                "but state clearly that the information was not in the uploaded document. "
                "Format your answer in a clear, easy-to-read markdown format. Be supportive and educational."
            )),
            ("user", "Context:\n{context}\n\nQuestion: {question}")
        ])
        
        chain = prompt | llm
        response = chain.invoke({
            "context": context_text,
            "question": question
        })
        
        return response.content, context_chunks
