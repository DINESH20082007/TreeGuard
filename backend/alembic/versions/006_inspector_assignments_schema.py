"""inspector_assignments_schema

Revision ID: 006_inspector_assignments_schema
Revises: 005_emergency_analyses_schema
Create Date: 2026-09-19 10:45:00.000000

"""
from typing import Sequence, Union
from alembic import op
import sqlalchemy as sa

# revision identifiers, used by Alembic.
revision: str = '006_inspector_assignments_schema'
down_revision: Union[str, None] = '005_emergency_analyses_schema'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None

def upgrade() -> None:
    op.create_table(
        'inspector_assignments',
        sa.Column('id', sa.String(length=36), nullable=False),
        sa.Column('inspector_id', sa.String(length=36), nullable=False),
        sa.Column('report_id', sa.String(length=36), nullable=True),
        sa.Column('tree_id', sa.String(length=36), nullable=True),
        sa.Column('title', sa.String(length=255), nullable=False),
        sa.Column('location_name', sa.String(length=255), nullable=False),
        sa.Column('latitude', sa.Float(), nullable=True),
        sa.Column('longitude', sa.Float(), nullable=True),
        sa.Column('image_url', sa.String(length=500), nullable=True),
        sa.Column('priority', sa.String(length=20), nullable=False, server_default='Medium'),
        sa.Column('status', sa.String(length=50), nullable=False, server_default='assigned'),
        sa.Column('ai_assessment', sa.Text(), nullable=True),
        sa.Column('notes', sa.Text(), nullable=True),
        sa.Column('assigned_at', sa.DateTime(timezone=True), nullable=False),
        sa.Column('due_date', sa.DateTime(timezone=True), nullable=True),
        sa.Column('completed_at', sa.DateTime(timezone=True), nullable=True),
        sa.Column('created_at', sa.DateTime(timezone=True), nullable=False),
        sa.Column('updated_at', sa.DateTime(timezone=True), nullable=False),
        sa.ForeignKeyConstraint(['inspector_id'], ['users.id'], ondelete='CASCADE'),
        sa.ForeignKeyConstraint(['report_id'], ['reports.id'], ondelete='SET NULL'),
        sa.ForeignKeyConstraint(['tree_id'], ['trees.id'], ondelete='SET NULL'),
        sa.PrimaryKeyConstraint('id')
    )
    op.create_index(op.f('ix_inspector_assignments_inspector_id'), 'inspector_assignments', ['inspector_id'], unique=False)
    op.create_index(op.f('ix_inspector_assignments_report_id'), 'inspector_assignments', ['report_id'], unique=False)
    op.create_index(op.f('ix_inspector_assignments_tree_id'), 'inspector_assignments', ['tree_id'], unique=False)
    op.create_index(op.f('ix_inspector_assignments_status'), 'inspector_assignments', ['status'], unique=False)

def downgrade() -> None:
    op.drop_index(op.f('ix_inspector_assignments_status'), table_name='inspector_assignments')
    op.drop_index(op.f('ix_inspector_assignments_tree_id'), table_name='inspector_assignments')
    op.drop_index(op.f('ix_inspector_assignments_report_id'), table_name='inspector_assignments')
    op.drop_index(op.f('ix_inspector_assignments_inspector_id'), table_name='inspector_assignments')
    op.drop_table('inspector_assignments')
