# Password Recovery System - Integration Testing Guide

## Overview

This document outlines comprehensive testing procedures for the three-layered password recovery system in RMS.

## Pre-Testing Checklist

- [ ] Django migrations applied: `python manage.py migrate`
- [ ] SMTP credentials configured in `.env` (or console backend for testing)
- [ ] Electron app rebuilt if frontend changes made
- [ ] Both frontend and backend running
- [ ] Browser console open to catch JavaScript errors

## Test Scenarios

### Scenario 1: Account Setup Flow (First-Time Setup)

**Prerequisites:** Fresh RMS installation with no manager account

**Steps:**
1. Start RMS application
2. System should detect no manager account and show setup welcome
3. Click \"Get Started\"
4. **Step 2:** Create manager account
   - [ ] Full name field accepts letters and spaces only
   - [ ] Username field requires 4+ characters, no spaces
   - [ ] Password requires 8+ characters and at least one number
   - [ ] Confirm password must match
   - [ ] Click \"Create Account\"
5. **Step 3:** Account Recovery Setup
   - [ ] Recovery email field shows and accepts valid email
   - [ ] Security question dropdown displays 8 predefined questions
   - [ ] Answer field accepts text input
   - [ ] Click \"Save & Continue\"
   - [ ] Backend calls: `updateRecoverySettings()` + `recoverGenerateCode()`
6. **Recovery Code Display:**
   - [ ] Recovery code displays in large monospace font (RMS-XXXX-XXXX-XXXX format)
   - [ ] \"Copy to Clipboard\" button works, shows \"Copied ✓\" for 2 seconds
   - [ ] \"I have saved my recovery code\" checkbox appears
   - [ ] \"Enter RMS\" button is DISABLED until checkbox is checked
   - [ ] Check checkbox, \"Enter RMS\" button becomes ENABLED
   - [ ] Click \"Enter RMS\"
7. **Login Success:**
   - [ ] User is logged in and sees dashboard
   - [ ] Recovery code is one-time use and cannot be used again
   - [ ] Verify in DB: `recovery_code_used=True`

**Expected Outcome:** Manager account created with recovery email, security question, and active recovery code.

---

### Scenario 2: Recovery Code Method (Forgot Password)

**Prerequisites:** Completed account setup; recovery code available

**Steps:**
1. From login page, click \"Forgot password?\"
2. Should redirect to recovery.html page
3. **Method Selection:**
   - [ ] Three recovery methods visible: \"Recovery Code\", \"Email\", \"Security Question\"
   - [ ] Click \"Recovery Code\" option
4. **Recovery Code Form:**
   - [ ] Username field shows
   - [ ] Recovery code field shows (accepts RMS-XXXX-XXXX-XXXX format)
   - [ ] Enter username and code
   - [ ] Click \"Verify Code\"
5. **Backend Verification:**
   - [ ] API endpoint called: `POST /api/auth/recover/verify-code/`
   - [ ] Rate limiting checked (should pass on first attempt)
   - [ ] Code validated against hashed stored code
   - [ ] `recovery_code_used` flag updated to True
   - [ ] Response includes reset token or indicates success
6. **Set New Password:**
   - [ ] Form shows with new password + confirm fields
   - [ ] Password requirements enforced (8+ chars, 1 digit)
   - [ ] Enter new password and confirm
   - [ ] Click \"Set Password\"
7. **Backend Update:**
   - [ ] API endpoint called: `POST /api/auth/recover/set-password/`
   - [ ] Password updated in database
   - [ ] New recovery code generated
8. **Recovery Code Display:**
   - [ ] New code displays with copy button
   - [ ] \"I have saved my code\" checkbox shown
   - [ ] Cannot proceed without checkbox
   - [ ] After confirmation, redirect to login
9. **Login with New Password:**
   - [ ] Old code is invalid (one-time use)
   - [ ] New password successfully logs in user
   - [ ] New recovery code is now active

**Expected Outcome:** Password reset using recovery code, old code invalidated, new code generated.

---

### Scenario 3: Email Recovery Method

**Prerequisites:** Completed account setup; valid recovery email set

**Steps:**
1. From login page, click \"Forgot password?\"
2. On recovery page, click \"Email\" method
3. **Recovery Email Form:**
   - [ ] Username field shows
   - [ ] Enter valid username
   - [ ] Click \"Send Reset Link\"
4. **Backend Email Send:**
   - [ ] API endpoint called: `POST /api/auth/recover/send-email/`
   - [ ] Email generated with 30-minute expiring link
   - [ ] Email sent to `recovery_email` address (not username email)
   - [ ] Reset token stored with expiry timestamp
   - [ ] Audit log entry created
5. **Email Delivery:**
   - [ ] If SMTP backend: Check recipient email inbox
   - [ ] If console backend: Check Django console output
   - [ ] Email contains reset link with token parameter
6. **Click Email Link:**
   - [ ] Navigate to recovery link in email
   - [ ] Application recognizes token and shows password reset form
7. **Set New Password:**
   - [ ] Form validates password requirements
   - [ ] Enter new password and confirm
   - [ ] Click \"Set Password\"
8. **Backend Update:**
   - [ ] Token validated (not expired, matches user)
   - [ ] Password updated
   - [ ] New recovery code generated
   - [ ] Old token invalidated
9. **Recovery Code Display:**
   - [ ] New code shown with copy button
   - [ ] Confirmation checkbox required
   - [ ] After confirmation, redirect to login

**Expected Outcome:** Password reset via email link, one-time token used, new recovery code issued.

---

### Scenario 4: Security Question Recovery Method

**Prerequisites:** Completed account setup; security question configured

**Steps:**
1. From login page, click \"Forgot password?\"
2. On recovery page, click \"Security Question\" method
3. **Security Question Form:**
   - [ ] Username field shows
   - [ ] Enter username
   - [ ] Click \"Load Question\" or auto-load on blur
4. **Load Security Question:**
   - [ ] API endpoint called: `GET /api/auth/recover/settings/` (or similar)
   - [ ] Security question loads and displays
   - [ ] Answer field shows for user input
5. **Verify Answer:**
   - [ ] User enters answer (should be case-insensitive)
   - [ ] Click \"Verify Answer\"
6. **Backend Verification:**
   - [ ] API endpoint called: `POST /api/auth/recover/verify-question/`
   - [ ] Rate limiting checked
   - [ ] Answer compared using `check_password()` (case-insensitive)
   - [ ] Success/failure response
7. **Set New Password (on success):**
   - [ ] Password form shows
   - [ ] Enter new password and confirm
   - [ ] Click \"Set Password\"
8. **Backend Update:**
   - [ ] Password updated
   - [ ] New recovery code generated
   - [ ] Audit log entry created
9. **Recovery Code Display:**
   - [ ] New code shown
   - [ ] Confirmation checkbox required
   - [ ] After confirmation, redirect to login

**Expected Outcome:** Password reset using security question, case-insensitive answer validation, new recovery code issued.

---

### Scenario 5: Rate Limiting and Account Lockout

**Prerequisites:** Completed account setup

**Steps:**
1. Go to recovery page, select Recovery Code method
2. **First Failed Attempt:**
   - [ ] Enter invalid recovery code
   - [ ] Click \"Verify Code\"
   - [ ] Error message shows
   - [ ] `recovery_attempts` counter incremented to 1
3. **Second Failed Attempt:**
   - [ ] Try again with different invalid code
   - [ ] Error message shows
   - [ ] `recovery_attempts` incremented to 2
4. **Third Failed Attempt:**
   - [ ] Try again with different invalid code
   - [ ] After 3rd failure: `recovery_locked_until` set to 15 minutes from now
   - [ ] User should see: \"Too many failed attempts. Please try again later.\"
5. **Lockout Period:**
   - [ ] Attempt recovery within 15 minutes should fail with lockout message
   - [ ] Cannot try again until lockout expires
6. **After Lockout Expires (after 15+ minutes):**
   - [ ] User can attempt recovery again
   - [ ] `recovery_attempts` counter reset to 0
   - [ ] `recovery_locked_until` cleared

**Expected Outcome:** Account locked for 15 minutes after 3 failed attempts, lockout lifted after delay.

---

### Scenario 6: Email Expiry

**Prerequisites:** Completed account setup; SMTP configured

**Steps:**
1. Request email recovery link
2. **Immediately (within 30 minutes):**
   - [ ] Click email link
   - [ ] Password reset form shows
   - [ ] Reset works normally
3. **After 30+ Minutes:**
   - [ ] Try clicking original email link again
   - [ ] System should show: \"Reset link has expired. Request a new one.\"
   - [ ] Cannot reset with expired link

**Expected Outcome:** Email links expire after 30 minutes, preventing unauthorized access.

---

### Scenario 7: One-Time Code Usage

**Prerequisites:** Completed account setup with generated recovery code

**Steps:**
1. Save recovery code from setup
2. **Use code for first password reset:**
   - [ ] Go to recovery page, select Recovery Code
   - [ ] Enter username and valid code
   - [ ] Code accepted, reset form shown
   - [ ] Set new password
   - [ ] New recovery code generated and displayed
3. **Try using old code again:**
   - [ ] Go to recovery page, Recovery Code method
   - [ ] Enter username and original (now old) code
   - [ ] System should reject: \"Invalid recovery code\"
   - [ ] Cannot reuse same code

**Expected Outcome:** Each recovery code is single-use only; new code generated after each use.

---

### Scenario 8: System Settings Recovery Management

**Prerequisites:** User logged in as manager

**Steps:**
1. Navigate to System Settings (Admin tab)
2. **Account Recovery Section:**
   - [ ] Shows \"Recovery Email\" field with masked email (e.g., wa****@gmail.com)
   - [ ] Shows \"Security Question\" field with current question
   - [ ] Shows \"Recovery Code\" status (Active/None)
3. **Edit Recovery Email:**
   - [ ] Click \"Edit Recovery Email\" button
   - [ ] Modal shows with email input
   - [ ] Enter new email
   - [ ] Click \"Save Email\"
   - [ ] Backend endpoint called: `PATCH /api/auth/recover/settings/update/`
   - [ ] System Settings reloaded, new email shows (masked)
4. **Edit Security Question:**
   - [ ] Click \"Edit Security Question\" button
   - [ ] Modal shows with 8 question options
   - [ ] Select new question
   - [ ] Enter answer
   - [ ] Click \"Save Question\"
   - [ ] Settings reloaded with new question
5. **Generate New Recovery Code:**
   - [ ] Click \"Generate New Recovery Code\" button
   - [ ] Confirmation modal shows
   - [ ] Click \"Generate New Code\"
   - [ ] New code displays in monospace font
   - [ ] Copy button works
   - [ ] After copying, \"Done\" closes modal
   - [ ] System Settings reloaded, code status shows \"Active\"

**Expected Outcome:** All recovery settings manageable from System Settings UI.

---

### Scenario 9: Database Audit Logging

**Prerequisites:** Any recovery attempt completed

**Steps:**
1. Navigate to Audit Log in admin panel
2. **Check audit entries for recovery operations:**
   - [ ] Recovery code verification attempts logged
   - [ ] Email sent entries logged with recipient
   - [ ] Security question verification attempts logged
   - [ ] Password reset logged with method used
   - [ ] Failed attempts logged separately
3. **Audit log should include:**
   - [ ] Timestamp of operation
   - [ ] Username of user
   - [ ] Action (e.g., \"Verified recovery code\", \"Requested password reset email\")
   - [ ] Result (success/failure)
   - [ ] Number of attempts (for rate limiting)

**Expected Outcome:** All recovery operations properly audited and queryable.

---

### Scenario 10: Error Handling

**Test each error condition:**

1. **Invalid Email Format:**
   - [ ] Setup: Enter invalid email (no @)
   - [ ] System Settings: Try to save invalid email
   - [ ] Error message: \"Please enter a valid email address\"

2. **Missing Fields:**
   - [ ] Submit form with empty required fields
   - [ ] Error message shows for each missing field
   - [ ] Form doesn't submit

3. **Network Errors:**
   - [ ] Disconnect network before submitting form
   - [ ] UI shows appropriate error message
   - [ ] User can retry after reconnecting

4. **Backend Errors:**
   - [ ] Invalid username (doesn't exist)
   - [ ] Response: \"User not found\" or similar
   - [ ] Invalid recovery code format
   - [ ] Response: \"Invalid code format\"

**Expected Outcome:** Clear, helpful error messages for all failure scenarios.

---

## Automated Testing

### API Endpoint Tests (Recommended)

Create test cases for each endpoint:

```bash
# Verify code
curl -X POST http://localhost:8000/api/auth/recover/verify-code/ \
  -H "Content-Type: application/json" \
  -d '{"username":"testuser","code":"RMS-XXXX-XXXX-XXXX"}'

# Send email
curl -X POST http://localhost:8000/api/auth/recover/send-email/ \
  -H "Content-Type: application/json" \
  -d '{"username":"testuser"}'

# Verify question
curl -X POST http://localhost:8000/api/auth/recover/verify-question/ \
  -H "Content-Type: application/json" \
  -d '{"username":"testuser","answer":"my answer"}'

# Set password
curl -X POST http://localhost:8000/api/auth/recover/set-password/ \
  -H "Content-Type: application/json" \
  -d '{"username":"testuser","new_password":"NewPass123","method":"code"}'

# Get settings
curl -X GET http://localhost:8000/api/auth/recover/settings/ \
  -H "Authorization: Bearer YOUR_TOKEN"

# Update settings
curl -X PATCH http://localhost:8000/api/auth/recover/settings/update/ \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"recovery_email":"new@email.com","security_question":"What pet?","security_answer":"Fluffy"}'
```

---

## Browser Console Checks

During testing, monitor browser console for:

- [ ] No JavaScript errors
- [ ] No failed API calls (404, 500 errors)
- [ ] API responses contain expected data structure
- [ ] State management (recovery state) working correctly
- [ ] Recovery.js functions executing without errors

**Check console by:**
1. F12 or right-click → Inspect
2. Click \"Console\" tab
3. Perform recovery flow and watch for errors

---

## Performance Testing

- [ ] Recovery code generation completes in <1 second
- [ ] Email send completes in <3 seconds (may be slower for first SMTP connection)
- [ ] Password reset processes in <2 seconds
- [ ] No UI freezing during operations
- [ ] Rate limiting response immediate (no delay)

---

## Security Validation

- [ ] Recovery codes not visible in browser network tab (should be hashed)
- [ ] Email links use HTTPS only
- [ ] Passwords sent over HTTPS only
- [ ] Recovery attempts tracked and rate-limited
- [ ] Old codes cannot be reused
- [ ] Email links expire after 30 minutes
- [ ] Answers are case-insensitive but properly hashed
- [ ] No sensitive data logged in plain text

---

## Rollback Plan

If issues found during testing:

1. **Code Issues:** Revert affected file and redeploy
2. **Database Issues:** Rollback migration: `python manage.py migrate financials 0001`
3. **Email Configuration Issues:** Update `.env` and restart application
4. **API Endpoint Issues:** Check Django logs for specific errors

---

## Sign-Off Checklist

- [ ] All 10 scenarios tested and passed
- [ ] No JavaScript console errors
- [ ] No API errors in server logs
- [ ] Email delivery verified (if using SMTP)
- [ ] Rate limiting working correctly
- [ ] Audit logs capturing all operations
- [ ] Security validations passed
- [ ] Performance acceptable

## Known Limitations

1. **First-Time Setup:** Must be completed before system can be used normally
2. **Email Delivery:** Depends on SMTP configuration; console backend won't send real emails
3. **Recovery Email:** Must be different from username email for delivery
4. **Case Sensitivity:** Questions are case-sensitive, but answers are case-insensitive by design
5. **Code Format:** Codes are always in RMS-XXXX-XXXX-XXXX format; cannot be customized
