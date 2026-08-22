from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from database import get_db
from models.models import User, DeviceToken
from schemas.user import DeviceTokenRequest
from utils.security import get_current_user

# Router setup
router = APIRouter(prefix="/devices", tags=["Devices"])


@router.post("", status_code=204)
def register_device(payload: DeviceTokenRequest, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    """Register this install's push token, or move it to the current user."""
    token_row = db.query(DeviceToken).filter(DeviceToken.token == payload.token).first()
    if token_row:
        token_row.user_id = current_user.id
        token_row.platform = payload.platform
    else:
        db.add(DeviceToken(user_id=current_user.id, token=payload.token, platform=payload.platform))
    db.commit()
    return


@router.delete("", status_code=204)
def unregister_device(payload: DeviceTokenRequest, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    """Drop this install's token. Called on logout."""
    db.query(DeviceToken).filter(DeviceToken.token == payload.token, DeviceToken.user_id == current_user.id).delete()
    db.commit()
    return