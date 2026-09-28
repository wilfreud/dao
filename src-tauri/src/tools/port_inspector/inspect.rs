use super::contracts::{
    AddressFamily, CommandSuggestion, InspectPortResult, NetworkProtocol, PortSocket, ProcessOwner,
    ProcessSummary,
};
use super::fallback_commands::{generate_inspection_commands, PlatformTarget};
use crate::error::AppError;
use netstat2::{get_sockets_info, AddressFamilyFlags, ProtocolFlags, ProtocolSocketInfo, TcpState};
use std::collections::{BTreeMap, HashSet};
use sysinfo::{Pid, ProcessesToUpdate, System};

pub fn inspect_port_sync(port: u16) -> Result<InspectPortResult, AppError> {
    if port == 0 {
        return Err(AppError::InvalidPort(0));
    }

    let af_flags = AddressFamilyFlags::IPV4 | AddressFamilyFlags::IPV6;
    let proto_flags = ProtocolFlags::TCP | ProtocolFlags::UDP;

    let sockets_info = get_sockets_info(af_flags, proto_flags)
        .map_err(|e| AppError::SocketTableUnavailable(e.to_string()))?;

    let mut matching_sockets: Vec<PortSocket> = Vec::new();
    let mut visible_pids: HashSet<u32> = HashSet::new();
    let mut unresolved_socket_count: usize = 0;

    for s in sockets_info {
        match s.protocol_socket_info {
            ProtocolSocketInfo::Tcp(tcp_info) => {
                if tcp_info.local_port == port && tcp_info.state == TcpState::Listen {
                    let addr_family = if tcp_info.local_addr.is_ipv4() {
                        AddressFamily::Ipv4
                    } else {
                        AddressFamily::Ipv6
                    };

                    let pids = s.associated_pids.clone();
                    if pids.is_empty() {
                        unresolved_socket_count += 1;
                    } else {
                        for &pid in &pids {
                            visible_pids.insert(pid);
                        }
                    }

                    matching_sockets.push(PortSocket {
                        protocol: NetworkProtocol::Tcp,
                        address_family: addr_family,
                        local_address: tcp_info.local_addr.to_string(),
                        local_port: tcp_info.local_port,
                        tcp_state: Some("LISTEN".to_string()),
                        associated_pids: pids,
                    });
                }
            }
            ProtocolSocketInfo::Udp(udp_info) => {
                if udp_info.local_port == port {
                    let addr_family = if udp_info.local_addr.is_ipv4() {
                        AddressFamily::Ipv4
                    } else {
                        AddressFamily::Ipv6
                    };

                    let pids = s.associated_pids.clone();
                    if pids.is_empty() {
                        unresolved_socket_count += 1;
                    } else {
                        for &pid in &pids {
                            visible_pids.insert(pid);
                        }
                    }

                    matching_sockets.push(PortSocket {
                        protocol: NetworkProtocol::Udp,
                        address_family: addr_family,
                        local_address: udp_info.local_addr.to_string(),
                        local_port: udp_info.local_port,
                        tcp_state: None,
                        associated_pids: pids,
                    });
                }
            }
        }
    }

    // Refresh sysinfo to populate process metadata for visible PIDs
    let mut sys = System::new();
    sys.refresh_processes(ProcessesToUpdate::All, true);

    // Group sockets by PID into ProcessOwners
    let mut owner_sockets_map: BTreeMap<u32, Vec<PortSocket>> = BTreeMap::new();
    for socket in &matching_sockets {
        for &pid in &socket.associated_pids {
            owner_sockets_map
                .entry(pid)
                .or_default()
                .push(socket.clone());
        }
    }

    let mut owners: Vec<ProcessOwner> = Vec::new();
    for (pid, sockets) in owner_sockets_map {
        let process_summary = if let Some(proc_) = sys.process(Pid::from_u32(pid)) {
            ProcessSummary {
                pid,
                name: Some(proc_.name().to_string_lossy().to_string()),
                executable_path: proc_.exe().map(|p| p.to_string_lossy().to_string()),
                command: Some(
                    proc_
                        .cmd()
                        .iter()
                        .map(|c| c.to_string_lossy().to_string())
                        .collect(),
                ),
            }
        } else {
            ProcessSummary {
                pid,
                name: None,
                executable_path: None,
                command: None,
            }
        };

        owners.push(ProcessOwner {
            process: process_summary,
            sockets,
        });
    }

    let inspection_commands: Vec<CommandSuggestion> =
        generate_inspection_commands(PlatformTarget::current(), port);

    Ok(InspectPortResult {
        port,
        sockets: matching_sockets,
        owners,
        unresolved_socket_count,
        inspection_commands,
    })
}
