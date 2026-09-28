use crate::error::AppError;
use serde::{Deserialize, Serialize};
use std::net::{IpAddr, Ipv4Addr};

#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct NetworkInterfaceDto {
    pub name: String,
    pub address: String,
    pub is_private: boolean_type!(),
    pub is_recommended: bool,
}

// Macro helper for boolean field to keep code readable
macro_rules! boolean_type {
    () => {
        bool
    };
}
pub(crate) use boolean_type;

/// Returns true if an IPv4 address is eligible for Drop Server listening.
/// Excludes: loopback (127.0.0.0/8), unspecified (0.0.0.0), multicast (224.0.0.0/4),
/// link-local (169.254.0.0/16), and broadcast (255.255.255.255).
pub fn is_eligible_ipv4(ip: Ipv4Addr) -> bool {
    let octets = ip.octets();

    if ip.is_loopback() || octets[0] == 127 {
        return false;
    }
    if ip.is_unspecified() || ip.is_broadcast() {
        return false;
    }
    if ip.is_multicast() || octets[0] >= 224 {
        return false;
    }
    // Link-local: 169.254.0.0/16
    if octets[0] == 169 && octets[1] == 254 {
        return false;
    }

    true
}

/// Returns true if the IPv4 address falls within RFC1918 private address ranges:
/// - 10.0.0.0/8
/// - 172.16.0.0/12
/// - 192.168.0.0/16
pub fn is_private_ipv4(ip: Ipv4Addr) -> bool {
    let octets = ip.octets();
    match octets[0] {
        10 => true,
        172 => (16..=31).contains(&octets[1]),
        192 => octets[1] == 168,
        _ => false,
    }
}

/// Returns true if interface name is likely a virtual, tunnel, or container adapter.
fn is_likely_virtual_interface(name: &str) -> bool {
    let lower = name.to_ascii_lowercase();
    let virtual_prefixes = [
        "tun",
        "tap",
        "utun",
        "docker",
        "veth",
        "br-",
        "bridge",
        "tailscale",
        "wg",
        "wireguard",
        "vmnet",
        "vboxnet",
        "ham",
        "zt",
    ];

    virtual_prefixes
        .iter()
        .any(|&prefix| lower.starts_with(prefix))
}

/// Determines whether this candidate is recommended for local peer connection.
pub fn is_recommended_interface(name: &str, ip: Ipv4Addr) -> bool {
    is_private_ipv4(ip) && !is_likely_virtual_interface(name)
}

/// Enumerates all local network interfaces and returns eligible IPv4 candidates.
pub fn list_eligible_ipv4_interfaces() -> Result<Vec<NetworkInterfaceDto>, AppError> {
    let network_interfaces = local_ip_address::list_afinet_netifas()
        .map_err(|e| AppError::NetworkEnumerationFailed(e.to_string()))?;

    let mut candidates = Vec::new();

    for (name, ip_addr) in network_interfaces {
        if let IpAddr::V4(ipv4) = ip_addr {
            if is_eligible_ipv4(ipv4) {
                let is_private = is_private_ipv4(ipv4);
                let is_recommended = is_recommended_interface(&name, ipv4);

                candidates.push(NetworkInterfaceDto {
                    name,
                    address: ipv4.to_string(),
                    is_private,
                    is_recommended,
                });
            }
        }
    }

    // Sort: recommended first, then private, then by interface name
    candidates.sort_by(|a, b| {
        b.is_recommended
            .cmp(&a.is_recommended)
            .then_with(|| b.is_private.cmp(&a.is_private))
            .then_with(|| a.name.cmp(&b.name))
    });

    Ok(candidates)
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_is_eligible_ipv4() {
        // Excluded
        assert!(!is_eligible_ipv4(Ipv4Addr::new(127, 0, 0, 1)));
        assert!(!is_eligible_ipv4(Ipv4Addr::new(127, 255, 0, 1)));
        assert!(!is_eligible_ipv4(Ipv4Addr::new(0, 0, 0, 0)));
        assert!(!is_eligible_ipv4(Ipv4Addr::new(255, 255, 255, 255)));
        assert!(!is_eligible_ipv4(Ipv4Addr::new(224, 0, 0, 1)));
        assert!(!is_eligible_ipv4(Ipv4Addr::new(239, 255, 255, 250)));
        assert!(!is_eligible_ipv4(Ipv4Addr::new(169, 254, 1, 2)));

        // Eligible
        assert!(is_eligible_ipv4(Ipv4Addr::new(192, 168, 1, 50)));
        assert!(is_eligible_ipv4(Ipv4Addr::new(10, 0, 0, 15)));
        assert!(is_eligible_ipv4(Ipv4Addr::new(172, 20, 0, 100)));
        assert!(is_eligible_ipv4(Ipv4Addr::new(8, 8, 8, 8))); // Public eligible
    }

    #[test]
    fn test_is_private_ipv4() {
        assert!(is_private_ipv4(Ipv4Addr::new(10, 0, 1, 2)));
        assert!(is_private_ipv4(Ipv4Addr::new(172, 16, 0, 1)));
        assert!(is_private_ipv4(Ipv4Addr::new(172, 31, 255, 254)));
        assert!(!is_private_ipv4(Ipv4Addr::new(172, 32, 0, 1))); // Above /12
        assert!(!is_private_ipv4(Ipv4Addr::new(172, 15, 0, 1))); // Below /12
        assert!(is_private_ipv4(Ipv4Addr::new(192, 168, 0, 1)));
        assert!(!is_private_ipv4(Ipv4Addr::new(192, 169, 0, 1)));
        assert!(!is_private_ipv4(Ipv4Addr::new(1, 1, 1, 1)));
    }

    #[test]
    fn test_is_recommended_interface() {
        assert!(is_recommended_interface(
            "en0",
            Ipv4Addr::new(192, 168, 1, 24)
        ));
        assert!(is_recommended_interface("eth0", Ipv4Addr::new(10, 0, 0, 5)));
        assert!(is_recommended_interface(
            "wlan0",
            Ipv4Addr::new(172, 25, 1, 2)
        ));

        // Virtual interfaces should not be recommended even if private
        assert!(!is_recommended_interface(
            "docker0",
            Ipv4Addr::new(172, 17, 0, 1)
        ));
        assert!(!is_recommended_interface(
            "utun3",
            Ipv4Addr::new(10, 8, 0, 2)
        ));
        assert!(!is_recommended_interface(
            "tailscale0",
            Ipv4Addr::new(100, 64, 0, 1)
        ));

        // Public IPs not recommended
        assert!(!is_recommended_interface(
            "en0",
            Ipv4Addr::new(93, 184, 216, 34)
        ));
    }
}
