"""Referral schemas: program, code, signups, rewards."""
from datetime import datetime
from typing import List, Optional
from uuid import UUID

from pydantic import BaseModel, ConfigDict


class ReferralProgramUpdate(BaseModel):
    is_active: bool = True
    reward_type: str = "fixed"
    reward_value: float = 200.0
    minimum_order_amount: float = 0.0
    maximum_reward: Optional[float] = None
    eligible_service_ids: List[UUID] = []


class ReferralProgramOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: UUID
    is_active: bool
    reward_type: str
    reward_value: float
    minimum_order_amount: float
    maximum_reward: Optional[float] = None
    eligible_service_ids: List = []


class ReferralApply(BaseModel):
    code: str


class ReferralRewardOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: UUID
    referrer_id: UUID
    referred_user_id: UUID
    order_id: UUID
    amount: float
    reward_type: str
    status: str
    created_at: datetime


class ReferralSignupOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: UUID
    referrer_id: UUID
    referred_user_id: UUID
    code: str
    referred_at: datetime
    referred_name: Optional[str] = None


class MyReferralOut(BaseModel):
    code: str
    signups: int
    rewards_total: float = 0
    rewards: List[ReferralRewardOut] = []