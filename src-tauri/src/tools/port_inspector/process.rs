use super::contracts::{
    SignalAttempted, TerminateProcessRequest, TerminateProcessResult, TerminationMode,
};
use super::fallback_commands::{generate_termination_commands, PlatformTarget};
use crate::error::AppError;
use sysinfo::{Pid, ProcessesToUpdate, Signal, System};

pub fn terminate_process_sync(
    request: TerminateProcessRequest,
) -> Result<TerminateProcessResult, AppError> {
    let pid_u32 = request.pid;

    // Safety Invariant 1: Reject PID 0
    if pid_u32 == 0 {
        return Err(AppError::ProtectedProcess(
            0,
            "PID 0 is reserved for the kernel".to_string(),
        ));
    }

    // Safety Invariant 2: Reject PID 1
    if pid_u32 == 1 {
        return Err(AppError::ProtectedProcess(
            1,
            "PID 1 is the system init/launchd process and cannot be terminated".to_string(),
        ));
    }

    // Safety Invariant 3: Reject self PID
    let self_pid = std::process::id();
    if pid_u32 == self_pid {
        return Err(AppError::ProtectedProcess(
            self_pid,
            "Cannot terminate the current application process".to_string(),
        ));
    }

    let mut sys = System::new();
    let pid = Pid::from_u32(pid_u32);
    sys.refresh_processes(ProcessesToUpdate::Some(&[pid]), true);

    let proc_ = match sys.process(pid) {
        Some(p) => p,
        None => return Err(AppError::ProcessNotFound(pid_u32)),
    };

    let force = match request.mode {
        TerminationMode::Graceful => false,
        TerminationMode::Force => true,
    };

    let (signal_attempted, signal_sent) = if cfg!(windows) {
        let sent = proc_.kill();
        (SignalAttempted::PlatformTerminate, sent)
    } else {
        let target_signal = if force { Signal::Kill } else { Signal::Term };
        let sent = proc_.kill_with(target_signal).unwrap_or(false);
        let attempted = if force {
            SignalAttempted::Kill
        } else {
            SignalAttempted::Term
        };
        (attempted, sent)
    };

    // Wait briefly and re-check if process is still running
    std::thread::sleep(std::time::Duration::from_millis(60));
    sys.refresh_processes(ProcessesToUpdate::Some(&[pid]), true);
    let still_running = sys.process(pid).is_some();

    let termination_commands =
        generate_termination_commands(PlatformTarget::current(), pid_u32, force);

    Ok(TerminateProcessResult {
        pid: pid_u32,
        signal_attempted,
        signal_sent,
        still_running,
        termination_commands,
    })
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_protected_pids_rejected() {
        // PID 0 rejected
        let req0 = TerminateProcessRequest {
            pid: 0,
            port_context: 80,
            mode: TerminationMode::Graceful,
        };
        assert!(matches!(
            terminate_process_sync(req0),
            Err(AppError::ProtectedProcess(0, _))
        ));

        // PID 1 rejected
        let req1 = TerminateProcessRequest {
            pid: 1,
            port_context: 80,
            mode: TerminationMode::Graceful,
        };
        assert!(matches!(
            terminate_process_sync(req1),
            Err(AppError::ProtectedProcess(1, _))
        ));

        // Self PID rejected
        let self_pid = std::process::id();
        let req_self = TerminateProcessRequest {
            pid: self_pid,
            port_context: 80,
            mode: TerminationMode::Force,
        };
        assert!(matches!(
            terminate_process_sync(req_self),
            Err(AppError::ProtectedProcess(p, _)) if p == self_pid
        ));
    }

    #[test]
    fn test_nonexistent_pid_returns_not_found() {
        // High unlikely PID
        let req = TerminateProcessRequest {
            pid: 999_999_999,
            port_context: 1234,
            mode: TerminationMode::Graceful,
        };
        assert!(matches!(
            terminate_process_sync(req),
            Err(AppError::ProcessNotFound(999_999_999))
        ));
    }
}
