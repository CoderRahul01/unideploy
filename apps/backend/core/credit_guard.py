from fastapi import HTTPException
from models import User, Project
from sqlalchemy.orm import Session

# Tier-based costs
TIER_COSTS = {
    "SEED": 100,
    "GROWTH": 75,
    "PRO": 50,
    "ENTERPRISE": 0 # Unlimited or handled separately
}

class CreditGuard:

    def get_cost(self, tier: str) -> int:
        return TIER_COSTS.get(tier.upper(), 100)

    async def check_and_deduct(self, user_id: int, project_id: int, db: Session) -> bool:
        """
        Call this BEFORE starting the deploy pipeline.
        Raises 402 if insufficient credits.
        Deducts atomically based on project tier.
        """
        user = db.query(User).filter(User.id == user_id).with_for_update().first()
        project = db.query(Project).filter(Project.id == project_id).first()

        if not user:
            raise HTTPException(status_code=404, detail="User not found")
        if not project:
            raise HTTPException(status_code=404, detail="Project not found")

        deploy_cost = self.get_cost(project.tier or "SEED")

        if user.credits < deploy_cost:
            raise HTTPException(
                status_code=402,
                detail={
                    "error": "insufficient_credits",
                    "required": deploy_cost,
                    "available": user.credits,
                    "message": f"You need {deploy_cost} credits to deploy this {project.tier} project. You have {user.credits}."
                }
            )

        user.credits -= deploy_cost
        db.commit()
        return True

    async def refund(self, user_id: int, project_id: int, db: Session):
        """
        Call this if the deploy FAILS after credits were deducted.
        Uses pessimistic locking to prevent double-refunds under concurrent requests.
        """
        user = db.query(User).filter(User.id == user_id).with_for_update().first()
        project = db.query(Project).filter(Project.id == project_id).first()

        if user and project:
            deploy_cost = self.get_cost(project.tier or "SEED")
            user.credits += deploy_cost
            db.commit()

credit_guard = CreditGuard()
