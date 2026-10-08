from models.models import User
from sqlalchemy.orm import Session
from utils.billing import cancel_renewals
from utils.photos import delete_photo_file
from utils.trial_fingerprints import days_to_give_back, remember_trial


def delete_user(db: Session, user: User) -> bool:
    """Permanently delete the account and everything it owns. Used by the app's own account deletion and by the admin delete command.

    Deleting must never leave a subscription charging, so when a renewal can't be stopped nothing is deleted and False comes back."""
    if not cancel_renewals(user):
        return False
    remember_trial(db, user.email, days_to_give_back(user), "deleted")
    db.delete(user)
    delete_photo_file(user.photo_filename)
    for pet in user.pets:
        delete_photo_file(pet.photo_filename)
        for record in pet.records:
            for photo in record.photos:
                delete_photo_file(photo.filename)
    db.commit()
    return True
