"""user_profile_and_report_tree_fields

Revision ID: 010_user_profile_and_report_tree_fields
Revises: 009_notifications_schema
Create Date: 2026-09-19 11:45:00.000000

"""
from typing import Sequence, Union
from alembic import op
import sqlalchemy as sa

# revision identifiers, used by Alembic.
revision: str = '010_user_profile_and_report_tree_fields'
down_revision: Union[str, None] = '009_notifications_schema'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None

def upgrade() -> None:
    # Add profile fields to users table
    op.add_column('users', sa.Column('phone_number', sa.String(length=50), nullable=True))
    op.add_column('users', sa.Column('primary_district', sa.String(length=100), nullable=True, server_default='Downtown District'))
    op.add_column('users', sa.Column('avatar_url', sa.String(length=500), nullable=True))
    op.add_column('users', sa.Column('notification_preferences', sa.Text(), nullable=True))
    op.add_column('users', sa.Column('privacy_settings', sa.Text(), nullable=True))

    # Add tree_id to reports table
    op.add_column('reports', sa.Column('tree_id', sa.String(length=36), nullable=True))
    op.create_index(op.f('ix_reports_tree_id'), 'reports', ['tree_id'], unique=False)
    # Note: SQLite batch mode handles foreign keys, PostgreSQL adds foreign key directly
    try:
        op.create_foreign_key('fk_reports_trees', 'reports', 'trees', ['tree_id'], ['id'], ondelete='SET NULL')
    except Exception:
        pass

def downgrade() -> None:
    try:
        op.drop_constraint('fk_reports_trees', 'reports', type_='foreignkey')
    except Exception:
        pass
    op.drop_index(op.f('ix_reports_tree_id'), table_name='reports')
    op.drop_column('reports', 'tree_id')

    op.drop_column('users', 'privacy_settings')
    op.drop_column('users', 'notification_preferences')
    op.drop_column('users', 'avatar_url')
    op.drop_column('users', 'primary_district')
    op.drop_column('users', 'phone_number')
