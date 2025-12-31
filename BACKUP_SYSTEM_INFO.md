# 🛡️ Automatic Backup System

## ✅ System Status: ACTIVE

The backup system is **running inside your FastAPI backend server** and creates automatic backups every **12 hours**.

## 📍 Backup Location
```
/Users/qa_m2/Documents/Cursor AI/DrumGen Scorer DB backups/
```

## 📦 What Gets Backed Up

Each backup includes **EVERYTHING**:
1. ✅ **Database** (`drumgen.db`) - All test results, prompts, scores
2. ✅ **Audio Files** (`audio_files/`) - All 240 generated drum samples
3. ✅ **Note Attachments** (`illugen_audio/`) - All 727 audio files attached to notes

## 🔄 Backup Rotation

- **Keeps**: 2 most recent backups
- **Frequency**: Every 12 hours
- **Automatic cleanup**: Old backups are deleted automatically

This means you always have:
- Most recent backup (0-12 hours old)
- Previous backup (12-24 hours old)

## 🚀 How It Works

The backup service:
1. Starts automatically when the backend server starts
2. Creates an immediate backup on startup
3. Schedules backups every 12 hours
4. Keeps only the 2 most recent backups
5. Logs all activity

## 📊 Checking Backups

**List all backups:**
```bash
ls -lah "/Users/qa_m2/Documents/Cursor AI/DrumGen Scorer DB backups/"
```

**Verify a backup:**
```bash
cd "/Users/qa_m2/Documents/Cursor AI/DrumGen Scorer DB backups/backup_YYYY-MM-DD_HH-MM-SS"
ls -lh
cat backup_info.txt
```

**Check database in backup:**
```bash
sqlite3 drumgen.db "SELECT COUNT(*) FROM test_results"
```

## 🔧 Configuration

The backup system is configured in:
- **Service**: `backend/backup_service.py`
- **Integration**: `backend/main.py` (startup event)
- **Interval**: 43200 seconds (12 hours)
- **Max backups**: 2

## 🆘 Manual Backup

If you need an immediate backup:
```python
# From within Python/backend
from backend.backup_service import create_backup
create_backup()
```

## 🔐 Safety Features

- **No deletion of source files**: Only copies, never moves or deletes original data
- **Atomic operations**: Each backup completes fully before cleanup
- **Error logging**: All errors are logged for troubleshooting
- **Validation**: Each backup includes a manifest file with metadata

## 📝 Backup Contents Example

```
backup_2025-12-29_09-57-15/
├── drumgen.db          (1.48 MB, 241 test results)
├── audio_files/        (240 WAV files)
├── illugen_audio/      (727 files in 242 directories)
└── backup_info.txt     (Backup metadata)
```

## ⚠️ Important Notes

1. **Server must be running**: Backups only happen when the backend server is active
2. **External location**: Backups are stored OUTSIDE the project directory
3. **Git-independent**: These backups are not in git, they're physical file copies
4. **Space requirements**: Each backup is ~20-30 MB

## 🔄 Recovery Instructions

To restore from a backup:
1. **Stop the backend server**
2. Navigate to backup directory
3. Copy files back to project:
   ```bash
   cd "/Users/qa_m2/Documents/Cursor AI/DrumGen Scorer DB backups/backup_YYYY-MM-DD_HH-MM-SS"
   cp -r * "/Users/qa_m2/Documents/Cursor AI/DrumGen Scorer/"
   ```
4. **Restart the backend server**

---

**Last Updated**: December 29, 2025  
**System Status**: ✅ Active and Verified
