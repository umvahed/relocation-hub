from fastapi import APIRouter, HTTPException
from app.config import settings
from supabase import create_client

router = APIRouter()
_supabase = None

def get_supabase():
    global _supabase
    if _supabase is None:
        _supabase = create_client(settings.SUPABASE_URL, settings.SUPABASE_SERVICE_KEY)
    return _supabase


@router.get("/documents/{user_id}")
async def list_documents(user_id: str):
    try:
        supabase = get_supabase()
        result = supabase.table("documents").select(
            "id, task_id, file_name, file_path, file_size, mime_type, category, created_at"
        ).eq("user_id", user_id).order("created_at", desc=True).execute()
        return {"documents": result.data}
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))


@router.delete("/documents/{document_id}")
async def delete_document(document_id: str, user_id: str):
    try:
        supabase = get_supabase()
        doc_res = supabase.table("documents").select("file_path, user_id").eq("id", document_id).execute()
        if not doc_res.data:
            raise HTTPException(status_code=404, detail="Document not found")

        doc = doc_res.data[0]
        if doc["user_id"] != user_id:
            raise HTTPException(status_code=403, detail="Forbidden")

        supabase.storage.from_("documents").remove([doc["file_path"]])
        supabase.table("documents").delete().eq("id", document_id).execute()

        return {"message": "Document deleted"}
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))
