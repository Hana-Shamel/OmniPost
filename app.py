# -*- coding: utf-8 -*-
"""
FastAPI server for the Social Media Post Generator web application.
"""

import os
import json
import uuid
from datetime import datetime
from typing import Optional, List
from pydantic import BaseModel, Field
from fastapi import FastAPI, HTTPException, Request
from fastapi.responses import HTMLResponse, JSONResponse
from fastapi.staticfiles import StaticFiles
from fastapi.middleware.cors import CORSMiddleware

from model import generate_social_post

app = FastAPI()

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

HISTORY_FILE = os.path.join(os.path.dirname(__file__), "history.json")


def load_history() -> List[dict]:
    if not os.path.exists(HISTORY_FILE):
        return []
    try:
        with open(HISTORY_FILE, "r", encoding="utf-8") as f:
            return json.load(f)
    except Exception:
        return []


def save_history(items: List[dict]):
    with open(HISTORY_FILE, "w", encoding="utf-8") as f:
        json.dump(items, f, ensure_ascii=False, indent=2)


class GenerateRequest(BaseModel):
    subject: str = Field(...)
    tone: str = Field(default="enthusiastic")
    key_message: Optional[str] = Field(default="")
    target_audience: Optional[str] = Field(default="General Audience")
    length: Optional[str] = Field(default="medium")
    include_emojis: Optional[str] = Field(default="engaging")
    platform: Optional[str] = Field(default="linkedin")
    deep_reflection: Optional[bool] = Field(default=True)
    reference_context: Optional[str] = Field(default="")


class HistoryItem(BaseModel):
    id: str
    created_at: str
    subject: str
    tone: str
    key_message: str
    target_audience: str
    length: str
    include_emojis: str
    platform: str
    content: str
    character_count: int
    word_count: int
    hashtags: List[str]
    is_favorite: bool = False
    reflection: Optional[str] = None
    reference_context: Optional[str] = None


@app.post("/api/generate")
def api_generate_post(req: GenerateRequest):
    if not req.subject.strip():
        raise HTTPException(status_code=400, detail="Subject is required.")

    try:
        result = generate_social_post(
            subject=req.subject.strip(),
            tone=req.tone,
            key_message=req.key_message or "",
            target_audience=req.target_audience or "General Audience",
            length=req.length or "medium",
            include_emojis=req.include_emojis or "engaging",
            platform=req.platform or "linkedin",
            deep_reflection=req.deep_reflection,
            reference_context=req.reference_context or ""
        )

        item = {
            "id": str(uuid.uuid4()),
            "created_at": datetime.now().isoformat(),
            "subject": req.subject.strip(),
            "tone": req.tone,
            "key_message": req.key_message or "",
            "target_audience": req.target_audience or "General Audience",
            "length": req.length or "medium",
            "include_emojis": req.include_emojis or "engaging",
            "platform": req.platform.lower() if req.platform else "linkedin",
            "platform_name": result.get("platform", req.platform),
            "content": result.get("content", ""),
            "character_count": result.get("character_count", 0),
            "word_count": result.get("word_count", 0),
            "hashtags": result.get("hashtags", []),
            "reflection": result.get("reflection", ""),
            "cot_plan": result.get("cot_plan", ""),
            "reference_context": req.reference_context or "",
            "is_favorite": False
        }

        # Save to history file
        history = load_history()
        history.insert(0, item)
        # Keep recent 100 items
        if len(history) > 100:
            history = history[:100]
        save_history(history)

        return {
            "success": True,
            "post": item
        }
    except Exception as e:
        import traceback
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=f"Generation failed: {str(e)}")


@app.get("/api/history")
def get_history(search: Optional[str] = None, platform: Optional[str] = None):
    history = load_history()
    if search:
        s = search.lower()
        history = [
            item for item in history 
            if s in item.get("subject", "").lower() or s in item.get("content", "").lower() or s in item.get("tone", "").lower()
        ]
    if platform and platform != "all":
        history = [item for item in history if item.get("platform", "").lower() == platform.lower()]
    return {"history": history, "total": len(history)}


@app.post("/api/history/{item_id}/toggle-favorite")
def toggle_favorite(item_id: str):
    history = load_history()
    found = False
    new_state = False
    for item in history:
        if item.get("id") == item_id:
            item["is_favorite"] = not item.get("is_favorite", False)
            new_state = item["is_favorite"]
            found = True
            break
    if not found:
        raise HTTPException(status_code=404, detail="Item not found")
    save_history(history)
    return {"success": True, "is_favorite": new_state}


@app.delete("/api/history/{item_id}")
def delete_history_item(item_id: str):
    history = load_history()
    filtered = [item for item in history if item.get("id") != item_id]
    save_history(filtered)
    return {"success": True}


@app.delete("/api/history")
def clear_all_history():
    save_history([])
    return {"success": True, "message": "History cleared"}


# Mount static directory for frontend
static_dir = os.path.join(os.path.dirname(__file__), "static")
if not os.path.exists(static_dir):
    os.makedirs(static_dir, exist_ok=True)

app.mount("/", StaticFiles(directory=static_dir, html=True), name="static")


if __name__ == "__main__":
    import uvicorn
    uvicorn.run("app:app", host="127.0.0.1", port=8000, reload=True)
