import React from 'react';
import { TextField } from '@mui/material';
import { USER_ROLES } from '../../constants/roles.js';

const RoleSelectField = ({ name = 'role', value, onChange, label = 'Role', required = true, ...props }) => (
  <TextField
    select
    margin="dense"
    label={label}
    name={name}
    value={value}
    onChange={onChange}
    fullWidth
    required={required}
    SelectProps={{ native: true }}
    {...props}
  >
    <option value="" aria-label="Select role" />
    {USER_ROLES.map((role) => (
      <option key={role.value} value={role.value}>
        {role.label}
      </option>
    ))}
  </TextField>
);

export default RoleSelectField;
