"""emergency_analyses_schema

Revision ID: 005_emergency_analyses_schema
Revises: 004_reports_schema
Create Date: 2026-09-19 10:30:00.000000

"""
from typing import Sequence, Union
from alembic import op
import sqlalchemy as sa

# revision identifiers, used by Alembic.
revision: str = '005_emergency_analyses_schema'
down_revision: Union[str, None] = '004_reports_schema'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None

def upgrade() -> None:
    op.create_table(
        'emergency_analyses',
        sa.Column('id', sa.String(length=36), nullable=False),
        sa.Column('user_id', sa.String(length=36), nullable=False),
        sa.Column('report_id', sa.String(length=36), nullable=True),
        sa.Column('tree_id', sa.String(length=36), nullable=True),
        sa.Column('image_url', sa.String(length=500), nullable=False),
        sa.Column('analysis_status', sa.String(length=50), nullable=False, server_default='completed'),
        sa.Column('emergency_detected', sa.Boolean(), nullable=False, server_default=sa.text('0')),
        sa.Column('severity', sa.String(length=20), nullable=False, server_default='None'),
        sa.Column('confidence', sa.Float(), nullable=False, server_default='0.0'),
        sa.Column('detected_issue', sa.String(length=255), nullable=False),
        sa.Column('explanation', sa.Text(), nullable=False),
        sa.Column('recommended_action', sa.Text(), nullable=False),
        sa.Column('detected_conditions', sa.Text(), nullable=True),
        sa.Column('risk_factors', sa.Text(), nullable=True),
        sa.Column('is_ai_available', sa.Boolean(), nullable=False, server_default=sa.text('0')),
        sa.Column('location_name', sa.String(length=255), nullable=True),
        sa.Column('latitude', sa.Float(), nullable=True),
        sa.Column('longitude', sa.Float(), nullable=True),
        sa.Column('created_at', sa.DateTime(timezone=True), nullable=False),
        sa.Column('updated_at', sa.DateTime(timezone=True), nullable=False),
        sa.ForeignKeyConstraint(['user_id'], ['users.id'], ondelete='CASCADE'),
        sa.ForeignKeyConstraint(['report_id'], ['reports.id'], ondelete='SET NULL'),
        sa.ForeignKeyConstraint(['tree_id'], ['trees.id'], ondelete='SET NULL'),
        sa.PrimaryKeyConstraint('id')
    )
    op.create_index(op.f('ix_emergency_analyses_user_id'), 'emergency_analyses', ['user_id'], unique=False)
    op.create_index(op.f('ix_emergency_analyses_report_id'), 'emergency_analyses', ['report_id'], unique=False)
    op.create_index(op.f('ix_emergency_analyses_tree_id'), 'emergency_analyses', ['tree_id'], unique=False)
    op.create_index(op.f('ix_emergency_analyses_analysis_status'), 'emergency_analyses', ['analysis_status'], unique=False)

def downgrade() -> None:
    op.drop_index(op.f('ix_emergency_analyses_analysis_status'), table_name='emergency_analyses')
    op.drop_index(op.f('ix_emergency_analyses_tree_id'), table_name='emergency_analyses')
    op.drop_index(op.f('ix_emergency_analyses_report_id'), table_name='emergency_analyses')
    op.drop_index(op.f('ix_emergency_analyses_user_id'), table_name='emergency_analyses')
    op.drop_table('emergency_analyses')
