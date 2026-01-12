import pytest
import os
import sys
from unittest.mock import MagicMock

# Add current dir to path
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from guards import StateMachine, SystemGuard
import models

def test_state_machine_legal_transitions():
    """Laws of the state machine must be obeyed."""
    # Allowed
    StateMachine.validate_transition("CREATED", "BUILT")
    StateMachine.validate_transition("BUILT", "WAKING")
    StateMachine.validate_transition("WAKING", "RUNNING")
    StateMachine.validate_transition("RUNNING", "SLEEPING")
    StateMachine.validate_transition("SLEEPING", "WAKING")
    
    # Same state is always allowed (idempotency)
    StateMachine.validate_transition("RUNNING", "RUNNING")

def test_state_machine_illegal_transitions():
    """Illegal jumps must be caught."""
    with pytest.raises(ValueError, match="Illegal status transition"):
        StateMachine.validate_transition("CREATED", "RUNNING")
    
    with pytest.raises(ValueError, match="Illegal status transition"):
        StateMachine.validate_transition("SLEEPING", "BUILT")

def test_read_only_mode_invariant(monkeypatch):
    """READ_ONLY mode must block start/build."""
    monkeypatch.setenv("UNIDEPLOY_READ_ONLY", "true")
    assert SystemGuard.is_read_only() is True
    
    mock_db = MagicMock()
    mock_project = MagicMock(spec=models.Project)
    
    can_start, msg = SystemGuard.can_start_project(mock_project, mock_db)
    assert can_start is False
    assert "READ-ONLY" in msg
    
    can_build, msg = SystemGuard.can_build_project(mock_db)
    assert can_build is False
    assert "READ-ONLY" in msg

def test_daily_runtime_limit_invariant():
    """Project cannot start if daily limit is reached."""
    mock_project = MagicMock(spec=models.Project)
    mock_project.daily_runtime_minutes = 60
    mock_db = MagicMock()
    
    # Force read-only to false for this test
    os.environ["UNIDEPLOY_READ_ONLY"] = "false"
    
    can_start, msg = SystemGuard.can_start_project(mock_project, mock_db)
    assert can_start is False
    assert "limit reached" in msg.lower()

def test_concurrency_limit_invariant():
    """User cannot have >1 running project on free tier."""
    mock_project = MagicMock(spec=models.Project)
    mock_project.owner_id = 1
    mock_project.daily_runtime_minutes = 0
    
    mock_db = MagicMock()
    # 1st call: global check (returns 0)
    # 2nd call: user check (returns 1)
    mock_db.query.return_value.filter.return_value.count.side_effect = [0, 1]
    
    can_start, msg = SystemGuard.can_start_project(mock_project, mock_db)
    assert can_start is False
    assert "Free tier limit" in msg
