"""tree_detail_fields

Revision ID: 003_tree_detail_fields
Revises: 002_trees_schema
Create Date: 2026-09-19 10:00:00.000000

"""
from typing import Sequence, Union
from alembic import op
import sqlalchemy as sa

# revision identifiers, used by Alembic.
revision: str = '003_tree_detail_fields'
down_revision: Union[str, None] = '002_trees_schema'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None

def upgrade() -> None:
    op.add_column('trees', sa.Column('health_confidence', sa.Integer(), nullable=True, server_default='85'))
    op.add_column('trees', sa.Column('image_url', sa.String(length=500), nullable=True))

def downgrade() -> None:
    op.drop_column('trees', 'image_url')
    op.drop_column('trees', 'health_confidence')
