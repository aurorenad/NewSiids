package org.example.siidsbackend.Model;

import org.springframework.security.core.GrantedAuthority;
import org.springframework.security.core.authority.SimpleGrantedAuthority;
import org.springframework.security.core.userdetails.UserDetails;

import java.util.Collection;
import java.util.Collections;
import java.util.HashSet;
import java.util.List;
import java.util.Set;
public class UserPrincipal implements UserDetails {
    private User user;
    private Set<String> permissions;

    public UserPrincipal(User user) {
        this(user, Set.of());
    }

    public UserPrincipal(User user, Set<String> permissions) {
        this.user = user;
        this.permissions = permissions == null ? Set.of() : permissions;
    }
    @Override
    public Collection<? extends GrantedAuthority> getAuthorities() {
        String role = user.getRole();
        if (role == null && permissions.isEmpty()) return Collections.emptyList();
        
        Set<GrantedAuthority> authorities = new HashSet<>();
        if (role != null) {
            String normalized = role.toUpperCase().replace("ROLE_", "");
            // Return original, normalized, and ROLE_ prefixed for maximum flexibility.
            authorities.add(new SimpleGrantedAuthority(role));
            authorities.add(new SimpleGrantedAuthority(normalized));
            authorities.add(new SimpleGrantedAuthority("ROLE_" + normalized));
        }
        permissions.forEach(permission -> authorities.add(new SimpleGrantedAuthority(permission)));
        return authorities;
    }

    @Override
    public String getPassword() {
        return user.getPassword();
    }

    @Override
    public String getUsername() {
        return user.getUsername();
    }

    @Override
    public boolean isAccountNonExpired() {
        return true;
    }

    @Override
    public boolean isAccountNonLocked() {
        return true;
    }

    @Override
    public boolean isCredentialsNonExpired() {
        return true;
    }

    @Override
    public boolean isEnabled() {
        return true;
    }
}
