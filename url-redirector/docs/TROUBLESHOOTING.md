# Fixing Playwright UI Mode - EMFILE Error

## Problem
The error `EMFILE: too many open files` occurs when the system runs out of file watcher instances.

## Root Cause
- **max_user_watches**: Limit on total files that can be watched (was already 524288 ✓)
- **max_user_instances**: Limit on number of inotify instances (was only 128 ✗)

You had 136 inotify instances already in use, so Playwright couldn't create a new one.

## Solution Applied

### Temporary Fix (Current Session)
```bash
sudo sysctl fs.inotify.max_user_instances=512
```

### Permanent Fix
Add to `/etc/sysctl.conf`:
```bash
echo "fs.inotify.max_user_instances=512" | sudo tee -a /etc/sysctl.conf
```

Then reload:
```bash
sudo sysctl -p
```

## Verification
```bash
# Check current limit
cat /proc/sys/fs/inotify/max_user_instances
# Should show: 512

# Check current usage
find /proc/*/fd -lname anon_inode:inotify 2>/dev/null | wc -l
# Should be less than 512
```

## Summary
- ✅ **max_user_watches**: 524288 (controls how many files can be watched)
- ✅ **max_user_instances**: 512 (controls how many watchers can exist)

Now `npm run test:ui` should work!
