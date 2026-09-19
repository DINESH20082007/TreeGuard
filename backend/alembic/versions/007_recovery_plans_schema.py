"""recovery_plans_schema

Revision ID: 007_recovery_plans_schema
Revises: 006_inspector_assignments_schema
Create Date: 2026-09-19 11:00:00.000000

"""
from typing import Sequence, Union
from alembic import op
import sqlalchemy as sa

# revision identifiers, used by Alembic.
revision: str = '007_recovery_plans_schema'
down_revision: Union[str, None] = '006_inspector_assignments_schema'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None

def upgrade() -> None:
    op.create_table(
        'recovery_plans',
        sa.Column('id', sa.String(length=36), nullable=False),
        sa.Column('tree_id', sa.String(length=36), nullable=False),
        sa.Column('creator_id', sa.String(length=36), nullable=False),
        sa.Column('assigned_inspector_id', sa.String(length=36), nullable=True),
        sa.Column('assigned_inspector_name', sa.String(length=255), nullable=True, server_default='Marcus Johnson'),
        sa.Column('status', sa.String(length=50), nullable=False, server_default='In Progress'),
        sa.Column('priority', sa.String(length=20), nullable=False, server_default='Medium'),
        sa.Column('severity', sa.String(length=20), nullable=False, server_default='Moderate'),
        sa.Column('detected_issue', sa.String(length=255), nullable=False, server_default='Potential drought stress'),
        sa.Column('ai_assessment', sa.Text(), nullable=True),
        sa.Column('ai_confidence', sa.Integer(), nullable=True, server_default='82'),
        sa.Column('actions', sa.Text(), nullable=False, server_default='[]'),
        sa.Column('target_date', sa.String(length=50), nullable=True),
        sa.Column('reinspection_date', sa.String(length=50), nullable=True),
        sa.Column('notes', sa.Text(), nullable=True),
        sa.Column('timeline', sa.Text(), nullable=True, server_default='[]'),
        sa.Column('created_at', sa.DateTime(timezone=True), nullable=False),
        sa.Column('updated_at', sa.DateTime(timezone=True), nullable=False),
        sa.ForeignKeyConstraint(['tree_id'], ['trees.id'], ondelete='CASCADE'),
        sa.ForeignKeyConstraint(['creator_id'], ['users.id'], ondelete='CASCADE'),
        sa.ForeignKeyConstraint(['assigned_inspector_id'], ['users.id'], ondelete='SET NULL'),
        sa.PrimaryKeyConstraint('id')
    )
    op.create_index(op.f('ix_recovery_plans_tree_id'), 'recovery_plans', ['tree_id'], unique=False)
    op.create_index(op.f('ix_recovery_plans_creator_id'), 'recovery_plans', ['creator_id'], unique=False)
    op.create_index(op.f('ix_recovery_plans_assigned_inspector_id'), 'recovery_plans', ['assigned_inspector_id'], unique=False)
    op.create_index(op.f('ix_recovery_plans_status'), 'recovery_plans', ['status'], unique=False)

def downgrade() -> None:
    op.drop_index(op.f('ix_recovery_plans_status'), table_name='recovery_plans')
    op.drop_index(op.f('ix_recovery_plans_assigned_inspector_id'), table_name='recovery_plans')
    op.drop_index(op.f('ix_recovery_plans_creator_id'), table_name='recovery_plans')
    op.drop_index(op.f('ix_recovery_plans_tree_id'), table_name='recovery_plans')
    op.drop_table('recovery_plans')
