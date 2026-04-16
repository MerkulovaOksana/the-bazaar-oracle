from fastapi import APIRouter, Depends, UploadFile, File, HTTPException
from pydantic import BaseModel
from sqlalchemy.ext.asyncio import AsyncSession

from ..database import get_db
from ..deps import get_current_user
from ..models.models import User, Prediction, AnalyticsEvent
from ..services.predictor import predict_from_screenshot, run_simulation, run_simulation_from_preset
from ..simulation.items_catalog import get_catalog_items, MONSTERS

router = APIRouter(prefix="/predict", tags=["predict"])


class ManualPredictRequest(BaseModel):
    player_items: list[str]
    player_hp: float = 500
    monster_items: list[str]
    monster_hp: float = 400
    monster_name: str = "Monster"


class PresetPredictRequest(BaseModel):
    player_items: list[str]
    player_hp: float = 500
    monster_id: str


@router.post("/screenshot")
async def predict_screenshot(
    file: UploadFile = File(...),
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    if not file.content_type or not file.content_type.startswith("image/"):
        raise HTTPException(status_code=400, detail="Upload an image file")

    image_bytes = await file.read()
    if len(image_bytes) > 10 * 1024 * 1024:
        raise HTTPException(status_code=400, detail="Image too large (max 10MB)")

    result = await predict_from_screenshot(image_bytes, file.content_type)
    sim = result["simulation"]

    prediction = Prediction(
        user_id=user.id,
        player_items=sim["player_items"],
        monster_name=sim["monster_name"],
        monster_items=sim["monster_items"],
        predicted_winner=sim["winner"],
        player_hp_remaining=sim["player_hp_remaining"],
        monster_hp_remaining=sim["monster_hp_remaining"],
        battle_time_ms=sim["battle_time_ms"],
        source="web",
    )
    db.add(prediction)
    db.add(AnalyticsEvent(user_id=user.id, event_type="prediction_screenshot"))
    await db.commit()

    return result


@router.post("/manual")
async def predict_manual(
    req: ManualPredictRequest,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    sim = run_simulation(
        player_item_ids=req.player_items,
        player_hp=req.player_hp,
        monster_item_ids=req.monster_items,
        monster_hp=req.monster_hp,
        monster_name=req.monster_name,
    )

    prediction = Prediction(
        user_id=user.id,
        player_items=req.player_items,
        monster_name=req.monster_name,
        monster_items=req.monster_items,
        predicted_winner=sim["winner"],
        player_hp_remaining=sim["player_hp_remaining"],
        monster_hp_remaining=sim["monster_hp_remaining"],
        battle_time_ms=sim["battle_time_ms"],
        source="web",
    )
    db.add(prediction)
    db.add(AnalyticsEvent(user_id=user.id, event_type="prediction_manual"))
    await db.commit()

    return sim


@router.post("/preset")
async def predict_preset(
    req: PresetPredictRequest,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    sim = run_simulation_from_preset(
        player_item_ids=req.player_items,
        player_hp=req.player_hp,
        monster_id=req.monster_id,
    )

    if "error" in sim:
        raise HTTPException(status_code=400, detail=sim["error"])

    prediction = Prediction(
        user_id=user.id,
        player_items=req.player_items,
        monster_name=sim["monster_name"],
        monster_items=sim["monster_items"],
        predicted_winner=sim["winner"],
        player_hp_remaining=sim["player_hp_remaining"],
        monster_hp_remaining=sim["monster_hp_remaining"],
        battle_time_ms=sim["battle_time_ms"],
        source="web",
    )
    db.add(prediction)
    db.add(AnalyticsEvent(user_id=user.id, event_type="prediction_preset"))
    await db.commit()

    return sim


@router.get("/catalog")
async def get_items_catalog():
    return {"items": get_catalog_items()}


@router.get("/monsters")
async def get_monsters():
    result = []
    for k, v in MONSTERS.items():
        monster = {"id": k}
        monster.update({key: val for key, val in v.items() if key != "items"})
        monster["item_count"] = len(v.get("items", []))
        result.append(monster)
    return {"monsters": result}
