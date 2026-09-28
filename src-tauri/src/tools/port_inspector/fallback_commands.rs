use super::contracts::CommandSuggestion;

#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub enum PlatformTarget {
    MacOS,
    Linux,
    Windows,
}

impl PlatformTarget {
    pub fn current() -> Self {
        if cfg!(target_os = "macos") {
            Self::MacOS
        } else if cfg!(target_os = "windows") {
            Self::Windows
        } else {
            Self::Linux
        }
    }
}

pub fn generate_inspection_commands(platform: PlatformTarget, port: u16) -> Vec<CommandSuggestion> {
    match platform {
        PlatformTarget::MacOS => vec![
            CommandSuggestion {
                label: "Check TCP listeners".to_string(),
                command: format!("lsof -nP -iTCP:{} -sTCP:LISTEN", port),
                requires_elevation: false,
            },
            CommandSuggestion {
                label: "Check TCP listeners (elevated)".to_string(),
                command: format!("sudo lsof -nP -iTCP:{} -sTCP:LISTEN", port),
                requires_elevation: true,
            },
            CommandSuggestion {
                label: "Check UDP sockets".to_string(),
                command: format!("lsof -nP -iUDP:{}", port),
                requires_elevation: false,
            },
        ],
        PlatformTarget::Linux => vec![
            CommandSuggestion {
                label: "Check TCP listeners".to_string(),
                command: format!("ss -lptn 'sport = :{}'", port),
                requires_elevation: false,
            },
            CommandSuggestion {
                label: "Check TCP listeners (elevated)".to_string(),
                command: format!("sudo ss -lptn 'sport = :{}'", port),
                requires_elevation: true,
            },
            CommandSuggestion {
                label: "Check UDP sockets".to_string(),
                command: format!("ss -lpun 'sport = :{}'", port),
                requires_elevation: false,
            },
        ],
        PlatformTarget::Windows => vec![
            CommandSuggestion {
                label: "Check TCP listeners (PowerShell)".to_string(),
                command: format!(
                    "Get-NetTCPConnection -LocalPort {} -State Listen | Select-Object LocalAddress,LocalPort,OwningProcess,State",
                    port
                ),
                requires_elevation: false,
            },
        ],
    }
}

pub fn generate_termination_commands(
    platform: PlatformTarget,
    pid: u32,
    force: bool,
) -> Vec<CommandSuggestion> {
    match platform {
        PlatformTarget::MacOS | PlatformTarget::Linux => {
            let sig = if force { "KILL" } else { "TERM" };
            let mode_label = if force { "Force kill" } else { "Terminate" };
            vec![
                CommandSuggestion {
                    label: format!("{} PID {}", mode_label, pid),
                    command: format!("kill -{} {}", sig, pid),
                    requires_elevation: false,
                },
                CommandSuggestion {
                    label: format!("{} PID {} (elevated)", mode_label, pid),
                    command: format!("sudo kill -{} {}", sig, pid),
                    requires_elevation: true,
                },
            ]
        }
        PlatformTarget::Windows => {
            if force {
                vec![CommandSuggestion {
                    label: format!("Force kill PID {} (PowerShell)", pid),
                    command: format!("Stop-Process -Id {} -Force", pid),
                    requires_elevation: false,
                }]
            } else {
                vec![
                    CommandSuggestion {
                        label: format!("Terminate PID {} (PowerShell)", pid),
                        command: format!("Stop-Process -Id {}", pid),
                        requires_elevation: false,
                    },
                    CommandSuggestion {
                        label: format!("Force kill PID {} (PowerShell)", pid),
                        command: format!("Stop-Process -Id {} -Force", pid),
                        requires_elevation: false,
                    },
                ]
            }
        }
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_macos_fallback_inspection_commands() {
        let cmds = generate_inspection_commands(PlatformTarget::MacOS, 3000);
        assert_eq!(cmds.len(), 3);
        assert_eq!(cmds[0].command, "lsof -nP -iTCP:3000 -sTCP:LISTEN");
        assert_eq!(cmds[1].command, "sudo lsof -nP -iTCP:3000 -sTCP:LISTEN");
        assert!(cmds[1].requires_elevation);
        assert_eq!(cmds[2].command, "lsof -nP -iUDP:3000");
    }

    #[test]
    fn test_linux_fallback_inspection_commands() {
        let cmds = generate_inspection_commands(PlatformTarget::Linux, 8080);
        assert_eq!(cmds.len(), 3);
        assert_eq!(cmds[0].command, "ss -lptn 'sport = :8080'");
        assert_eq!(cmds[1].command, "sudo ss -lptn 'sport = :8080'");
        assert_eq!(cmds[2].command, "ss -lpun 'sport = :8080'");
    }

    #[test]
    fn test_windows_fallback_inspection_commands() {
        let cmds = generate_inspection_commands(PlatformTarget::Windows, 5000);
        assert_eq!(cmds.len(), 1);
        assert!(cmds[0]
            .command
            .contains("Get-NetTCPConnection -LocalPort 5000"));
    }

    #[test]
    fn test_termination_commands() {
        let mac_graceful = generate_termination_commands(PlatformTarget::MacOS, 1234, false);
        assert_eq!(mac_graceful[0].command, "kill -TERM 1234");
        assert_eq!(mac_graceful[1].command, "sudo kill -TERM 1234");

        let mac_force = generate_termination_commands(PlatformTarget::MacOS, 1234, true);
        assert_eq!(mac_force[0].command, "kill -KILL 1234");
        assert_eq!(mac_force[1].command, "sudo kill -KILL 1234");

        let win_graceful = generate_termination_commands(PlatformTarget::Windows, 5678, false);
        assert_eq!(win_graceful[0].command, "Stop-Process -Id 5678");
        assert_eq!(win_graceful[1].command, "Stop-Process -Id 5678 -Force");
    }
}
