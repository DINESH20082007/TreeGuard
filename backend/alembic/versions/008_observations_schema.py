"""observations_schema

Revision ID: 008_observations_schema
Revises: 007_recovery_plans_schema
Create Date: 2026-09-19 11:15:00.000000

"""
from typing import Sequence, Union
from alembic import op
import sqlalchemy as sa

# revision identifiers, used by Alembic.
revision: str = '008_observations_schema'
down_revision: Union[str, None] = '007_recovery_plans_schema'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None

def upgrade() -> None:
    op.create_table(
        'observations',
        sa.Column('id', sa.String(length=36), nullable=False),
        sa.Column('tree_id', sa.String(length=36), nullable=False),
        sa.Column('inspector_id', sa.String(length=36), nullable=False),
        sa.Column('inspector_name', sa.String(length=255), nullable=False, server_default='Field Inspector'),
        sa.Column('assignment_id', sa.String(length=36), nullable=True),
        sa.Column('recovery_plan_id', sa.String(length=36), nullable=True),
        sa.Column('observation_date', sa.DateTime(timezone=True), nullable=False),
        sa.Column('image_url', sa.String(length=500), nullable=True),
        sa.Column('condition', sa.String(length=50), nullable=False, server_default='Fair'),
        sa.Column('health_score', sa.Integer(), nullable=True),
        sa.Column('previous_health_score', sa.Integer(), nullable=True),
        sa.Column('score_change', sa.Integer(), nullable=True),
        sa.Column('change_category', sa.String(length=50), nullable=True, server_default='stable'),
        sa.Column('canopy_condition', sa.String(length=100), nullable=True),
        sa.Column('structural_condition', sa.String(length=100), nullable=True),
        sa.Column('severity', sa.String(length=50), nullable=True, server_default='Moderate'),
        sa.Column('notes', sa.Text(), nullable=True),
        sa.Column('recommendations', sa.Text(), nullable=True),
        sa.Column('ai_assessment', sa.Text(), nullable=True),
        sa.Column('ai_confidence', sa.Integer(), nullable=True, server_default='84'),
        sa.Column('follow_up_required', sa.Boolean(), nullable=False, server_default=sa.text('0')),
        sa.Column('next_follow_up_date', sa.String(length=50), nullable=True),
        sa.Column('plan_status_update', sa.String(length=50), nullable=True),
        sa.Column('created_at', sa.DateTime(timezone=True), nullable=False),
        sa.Column('updated_at', sa.DateTime(timezone=True), nullable=False),
        sa.ForeignKeyConstraint(['tree_id'], ['trees.id'], ondelete='CASCADE'),
        sa.ForeignKeyConstraint(['inspector_id'], ['users.id'], ondelete='CASCADE'),
        sa.ForeignKeyConstraint(['assignment_id'], ['inspector_assignments.id'], ondelete='SET NULL'),
        sa.ForeignKeyConstraint(['recovery_plan_id'], ['recovery_plans.id'], ondelete='SET NULL'),
        sa.PrimaryKeyConstraint('id')
    )
    op.create_index(op.f('ix_observations_tree_id'), 'observations', ['tree_id'], unique=False)
    op.create_index(op.f('ix_observations_inspector_id'), 'observations', ['inspector_id'], unique=False)
    op.create_index(op.f('ix_observations_assignment_id'), 'observations', ['assignment_id'], unique=False)
    op.create_index(op.f('ix_observations_recovery_plan_id'), 'observations', ['recovery_plan_id'], unique=False)

def downgrade() -> None:
    op.drop_index(op.f('ix_observations_recovery_plan_id'), table_name='observations')
    op.drop_index(op.f('ix_observations_assignment_id'), table_name='observations')
    op.drop_index(op.f('ix_observations_inspector_id'), table_name='observations')
    op.drop_index(op.f('ix_observations_tree_id'), table_name='observations')
    op.drop_table('observations')
