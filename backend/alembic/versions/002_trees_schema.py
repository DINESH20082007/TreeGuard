"""trees_schema

Revision ID: 002_trees_schema
Revises: 001_initial_schema
Create Date: 2026-09-18 10:45:00.000000

"""
from typing import Sequence, Union
from alembic import op
import sqlalchemy as sa

# revision identifiers, used by Alembic.
revision: str = '002_trees_schema'
down_revision: Union[str, None] = '001_initial_schema'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None

def upgrade() -> None:
    # Create trees table
    op.create_table(
        'trees',
        sa.Column('id', sa.String(length=36), nullable=False),
        sa.Column('species', sa.String(length=100), nullable=False),
        sa.Column('common_name', sa.String(length=100), nullable=False),
        sa.Column('latitude', sa.Float(), nullable=False),
        sa.Column('longitude', sa.Float(), nullable=False),
        sa.Column('status', sa.String(length=50), nullable=False, server_default='healthy'),
        sa.Column('health_score', sa.Integer(), nullable=False, server_default='100'),
        sa.Column('location_name', sa.String(length=255), nullable=False),
        sa.Column('last_inspection', sa.String(length=100), nullable=False),
        sa.Column('height_m', sa.Float(), nullable=True),
        sa.Column('canopy_spread_m', sa.Float(), nullable=True),
        sa.Column('created_at', sa.DateTime(timezone=True), nullable=False),
        sa.Column('updated_at', sa.DateTime(timezone=True), nullable=False),
        sa.PrimaryKeyConstraint('id')
    )
    op.create_index(op.f('ix_trees_latitude'), 'trees', ['latitude'], unique=False)
    op.create_index(op.f('ix_trees_longitude'), 'trees', ['longitude'], unique=False)
    op.create_index(op.f('ix_trees_status'), 'trees', ['status'], unique=False)

def downgrade() -> None:
    op.drop_index(op.f('ix_trees_status'), table_name='trees')
    op.drop_index(op.f('ix_trees_longitude'), table_name='trees')
    op.drop_index(op.f('ix_trees_latitude'), table_name='trees')
    op.drop_table('trees')
