import React from 'react';
import { Grid, TextField } from '@mui/material';
import RoleSelectField from './RoleSelectField.jsx';

const UserOnboardingForm = ({ formData, onChange, disabled = false }) => (
  <Grid container spacing={2} sx={{ pt: 0.5 }}>
    <Grid item xs={12} sm={6}>
      <TextField
        margin="dense"
        label="Employee ID (Username)"
        name="employeeId"
        value={formData.employeeId}
        onChange={onChange}
        fullWidth
        required
        disabled={disabled}
      />
    </Grid>
    <Grid item xs={12} sm={6}>
      <RoleSelectField value={formData.role} onChange={onChange} disabled={disabled} />
    </Grid>
    <Grid item xs={12} sm={6}>
      <TextField
        margin="dense"
        label="Given Name"
        name="givenName"
        value={formData.givenName}
        onChange={onChange}
        fullWidth
        required
        disabled={disabled}
      />
    </Grid>
    <Grid item xs={12} sm={6}>
      <TextField
        margin="dense"
        label="Family Name"
        name="familyName"
        value={formData.familyName}
        onChange={onChange}
        fullWidth
        required
        disabled={disabled}
      />
    </Grid>
    <Grid item xs={12} sm={7}>
      <TextField
        margin="dense"
        label="Work Email"
        name="workEmail"
        type="email"
        value={formData.workEmail}
        onChange={onChange}
        fullWidth
        required
        disabled={disabled}
      />
    </Grid>
    <Grid item xs={12} sm={5}>
      <TextField
        margin="dense"
        label="Phone Number"
        name="phoneNumber"
        value={formData.phoneNumber}
        onChange={onChange}
        fullWidth
        disabled={disabled}
      />
    </Grid>
    <Grid item xs={12}>
      <TextField
        margin="dense"
        label="Temporary Password"
        name="temporaryPassword"
        type="password"
        value={formData.temporaryPassword}
        onChange={onChange}
        fullWidth
        required
        disabled={disabled}
        helperText="User will be forced to change this password on first login."
        autoComplete="new-password"
      />
    </Grid>
  </Grid>
);

export default UserOnboardingForm;
