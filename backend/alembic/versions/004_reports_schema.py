"""reports_schema

Revision ID: 004_reports_schema
Revises: 003_tree_detail_fields
Create Date: 2026-09-19 10:15:00.000000

"""
from typing import Sequence, Union
from alembic import op
import sqlalchemy as sa

# revision identifiers, used by Alembic.
revision: str = '004_reports_schema'
down_revision: Union[str, None] = '003_tree_detail_fields'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None

def upgrade() -> None:
    op.create_table(
        'reports',
        sa.Column('id', sa.String(length=36), nullable=False),
        sa.Column('reporter_id', sa.String(length=36), nullable=False),
        sa.Column('issue_type', sa.String(length=50), nullable=False),
        sa.Column('description', sa.Text(), nullable=True),
        sa.Column('location_name', sa.String(length=255), nullable=False),
        sa.Column('latitude', sa.Float(), nullable=True),
        sa.Column('longitude', sa.Float(), nullable=True),
        sa.Column('image_url', sa.String(length=500), nullable=False),
        sa.Column('priority', sa.String(length=20), nullable=False, server_default='Medium'),
        sa.Column('status', sa.String(length=50), nullable=False, server_default='pending'),
        sa.Column('observed_at', sa.String(length=100), nullable=True),
        sa.Column('additional_notes', sa.Text(), nullable=True),
        sa.Column('created_at', sa.DateTime(timezone=True), nullable=False),
        sa.Column('updated_at', sa.DateTime(timezone=True), nullable=False),
        sa.ForeignKeyConstraint(['reporter_id'], ['users.id'], ondelete='CASCADE'),
        sa.PrimaryKeyConstraint('id')
    )
    op.create_index(op.f('ix_reports_reporter_id'), 'reports', ['reporter_id'], unique=False)
    op.create_index(op.f('ix_reports_issue_type'), 'reports', ['issue_type'], unique=False)
    op.create_index(op.f('ix_reports_status'), 'reports', ['status'], unique=False)

def downgrade() -> None:
    op.drop_index(op.f('ix_reports_status'), table_name='reports')
    op.drop_index(op.f('ix_reports_issue_type'), table_name='reports')
    op.drop_index(op.f('ix_reports_reporter_id'), table_name='reports')
    op.drop_table('reports')
