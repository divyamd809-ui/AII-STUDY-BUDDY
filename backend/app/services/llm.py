import json
import re
from typing import List, Dict, Any, Optional
from langchain_google_genai import ChatGoogleGenerativeAI
from langchain_core.prompts import ChatPromptTemplate
from app.core.config import GEMINI_API_KEY, OPENAI_API_KEY
from app.models.schemas import QuizQuestion, FlashcardItem

class LLMService:
    def __init__(self):
        self.api_key = GEMINI_API_KEY
        if not self.api_key:
            # Fallback to checking environment directly
            import os
            self.api_key = os.getenv("GEMINI_API_KEY", "")
            
        self.model_name = "gemini-1.5-flash"
        
    def _get_llm(self) -> ChatGoogleGenerativeAI:
        if not self.api_key:
            raise ValueError("GEMINI_API_KEY is not set. Please add it to your environment variables or a .env file.")
        return ChatGoogleGenerativeAI(
            model=self.model_name,
            google_api_key=self.api_key,
            temperature=0.3
        )

    def generate_summary(self, text: str) -> str:
        try:
            llm = self._get_llm()
            prompt = ChatPromptTemplate.from_messages([
                ("system", (
                    "You are an expert AI tutor. Summarize the provided text in a detailed, structured, "
                    "and visually appealing markdown format. Use logical headings, key terminology lists, "
                    "bullet points, and a 'Key Takeaways' section. Make it easy for a student to study."
                )),
                ("user", "Here is the text to summarize:\n\n{text}")
            ])
            
            chain = prompt | llm
            # Limit input size to prevent token overflow
            response = chain.invoke({"text": text[:30000]})
            return response.content
        except Exception as e:
            return f"Error generating summary: {str(e)}"

    def generate_quiz(self, text: str, topic: str, num_questions: int = 5) -> List[Dict[str, Any]]:
        try:
            llm = self._get_llm()
            prompt = ChatPromptTemplate.from_messages([
                ("system", (
                    "You are an expert AI tutor. Generate a multiple-choice quiz based on the provided content. "
                    "If the content is empty, generate a general knowledge quiz on the topic: '{topic}'.\n"
                    "You must output ONLY a valid JSON array of objects, containing exactly {num_questions} questions. "
                    "Do not include any markdown format blocks, explanations outside of the JSON, or other text.\n"
                    "Each object in the JSON array must follow this structure:\n"
                    "{{\n"
                    '  "question": "What is the capital of France?",\n'
                    '  "options": ["London", "Paris", "Berlin", "Rome"],\n'
                    '  "answer": "Paris",\n'
                    '  "explanation": "Paris is the capital and most populous city of France."\n'
                    "}}\n"
                    "Ensure the 'answer' string exactly matches one of the options in the 'options' list."
                )),
                ("user", "Content to base the quiz on (can be empty):\n\n{text}")
            ])
            
            chain = prompt | llm
            response = chain.invoke({
                "text": text[:20000] if text else "No specific notes provided.",
                "topic": topic,
                "num_questions": num_questions
            })
            
            return self._parse_json_list(response.content)
        except Exception as e:
            # Fallback mock question if LLM fails or is not configured
            return [
                {
                    "question": f"Failed to generate quiz. Is the GEMINI_API_KEY valid? (Error: {str(e)[:60]}...)",
                    "options": ["Check API Key", "Retry", "Use Offline mode", "Contact Support"],
                    "answer": "Check API Key",
                    "explanation": "Please ensure your GEMINI_API_KEY environment variable is set."
                }
            ]

    def generate_flashcards(self, text: str, topic: str, num_cards: int = 5) -> List[Dict[str, str]]:
        try:
            llm = self._get_llm()
            prompt = ChatPromptTemplate.from_messages([
                ("system", (
                    "You are an expert AI tutor. Generate flashcards based on the provided content. "
                    "If the content is empty, generate general study flashcards on the topic: '{topic}'.\n"
                    "You must output ONLY a valid JSON array of objects, containing exactly {num_cards} cards. "
                    "Do not include any markdown format blocks, explanation outside of the JSON, or other text.\n"
                    "Each object in the JSON array must follow this structure:\n"
                    "{{\n"
                    '  "front": "Front of card (Question, term, or concept)",\n'
                    '  "back": "Back of card (Answer, explanation, or definition)"\n'
                    "}}\n"
                )),
                ("user", "Content to base the flashcards on (can be empty):\n\n{text}")
            ])
            
            chain = prompt | llm
            response = chain.invoke({
                "text": text[:20000] if text else "No specific notes provided.",
                "topic": topic,
                "num_cards": num_cards
            })
            
            return self._parse_json_list(response.content)
        except Exception as e:
            return [
                {
                    "front": f"Error: Flashcard generation failed",
                    "back": f"Please verify GEMINI_API_KEY configuration. Details: {str(e)}"
                }
            ]

    def _parse_json_list(self, content: str) -> List[Dict[str, Any]]:
        # Strip potential markdown code blocks (e.g. ```json ... ```)
        cleaned = content.strip()
        if cleaned.startswith("```"):
            # Remove start tag
            cleaned = re.sub(r"^```[a-zA-Z]*\n", "", cleaned)
            # Remove end tag
            cleaned = re.sub(r"\n```$", "", cleaned)
            cleaned = cleaned.strip()
            
        try:
            parsed = json.loads(cleaned)
            if isinstance(parsed, list):
                return parsed
            elif isinstance(parsed, dict) and "questions" in parsed:
                return parsed["questions"]
            elif isinstance(parsed, dict) and "flashcards" in parsed:
                return parsed["flashcards"]
            return [parsed]
        except json.JSONDecodeError:
            # Fallback regex extraction if JSON is slightly malformed
            match = re.search(r"\[\s*\{.*\}\s*\]", cleaned, re.DOTALL)
            if match:
                try:
                    return json.loads(match.group(0))
                except:
                    pass
            raise ValueError(f"Could not parse response as JSON list. Raw response: {content}")
