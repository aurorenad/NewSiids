package org.example.siidsbackend.Service;


import org.example.siidsbackend.Model.UserPrincipal;
import org.example.siidsbackend.Repository.UserRepo;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.security.core.userdetails.UserDetailsService;
import org.springframework.security.core.userdetails.UsernameNotFoundException;
import org.springframework.lang.NonNull;
import org.springframework.stereotype.Service;

import org.example.siidsbackend.Model.User;
import org.example.siidsbackend.Service.RbacService;
@Service
public class MyUserDetailsService implements UserDetailsService {

    @Autowired
    private UserRepo userRepo;

    @Autowired
    private RbacService rbacService;


    @Override
    public UserDetails loadUserByUsername(@NonNull String username) throws UsernameNotFoundException {
        User user = userRepo.findByUsername(username).orElse(null);
        if (user == null) {
            System.out.println("User Not Found");
            throw new UsernameNotFoundException("user not found");
        }

        return new UserPrincipal(user, rbacService.getPermissionsForRole(user.getRole()));
    }
}
