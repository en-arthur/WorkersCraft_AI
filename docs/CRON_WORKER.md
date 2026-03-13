# Scheduled Deployments - Cron Worker

This cron worker executes scheduled deployments automatically.

## How It Works

1. Runs every 5 minutes (configurable)
2. Queries `scheduled_deployments` table for schedules due to run
3. Triggers deployment for each project
4. Updates `last_run_at` and calculates `next_run_at`
5. Sends notifications on completion

## Setup

### Option 1: Vercel Cron (Recommended)

The `vercel.json` file is already configured to run the cron every 5 minutes.

1. Add `CRON_SECRET` to Vercel environment variables:
   ```bash
   # Generate a secret
   node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
   
   # Add to Vercel
   vercel env add CRON_SECRET
   ```

2. Deploy to Vercel:
   ```bash
   vercel --prod
   ```

3. Vercel will automatically run `/api/cron/deployments` every 5 minutes

### Option 2: Manual Cron Job

Set up a cron job on your server:

```bash
# Edit crontab
crontab -e

# Add this line (runs every 5 minutes)
*/5 * * * * curl -X GET -H "Authorization: Bearer YOUR_CRON_SECRET" https://your-domain.com/api/cron/deployments
```

### Option 3: External Cron Service

Use services like:
- **cron-job.org**
- **EasyCron**
- **Cronitor**

Configure them to call:
```
GET https://your-domain.com/api/cron/deployments
Header: Authorization: Bearer YOUR_CRON_SECRET
```

## API Endpoint

### GET /api/cron/deployments

Processes all scheduled deployments that are due.

**Headers:**
```
Authorization: Bearer YOUR_CRON_SECRET
```

**Response:**
```json
{
  "message": "Schedules processed",
  "processed": 3,
  "results": [
    {
      "scheduleId": "uuid",
      "projectId": "uuid",
      "status": "success",
      "nextRun": "2026-03-14T17:00:00.000Z",
      "error": null
    }
  ]
}
```

## Configuration

### Frequency

Edit `vercel.json` to change frequency:

```json
{
  "crons": [
    {
      "path": "/api/cron/deployments",
      "schedule": "*/5 * * * *"  // Every 5 minutes
    }
  ]
}
```

Common schedules:
- `*/5 * * * *` - Every 5 minutes
- `*/15 * * * *` - Every 15 minutes
- `0 * * * *` - Every hour
- `0 0 * * *` - Daily at midnight

### Environment Variables

Required:
```bash
CRON_SECRET=your_secret_here
NEXT_PUBLIC_SITE_URL=https://your-domain.com
SUPABASE_SERVICE_ROLE_KEY=your_key
```

## Security

- Endpoint requires `CRON_SECRET` in Authorization header
- Uses Supabase service role key (server-side only)
- Validates all schedules before execution
- Logs all execution attempts

## Monitoring

Check logs in:
- Vercel Dashboard → Functions → Logs
- Or your server logs

Look for:
- `Schedules processed` - Success
- `No schedules to run` - Nothing due
- Errors - Check error messages

## Troubleshooting

### Schedules not running

1. Check `CRON_SECRET` is set correctly
2. Verify cron is actually running (check Vercel logs)
3. Check `next_run_at` in database is in the past
4. Ensure `enabled = true` in database

### Deployments failing

1. Check Vercel token is valid
2. Verify project exists and has files
3. Check deployment logs in Vercel
4. Ensure user has permission

### Manual trigger

Test the endpoint manually:
```bash
curl -X GET \
  -H "Authorization: Bearer YOUR_CRON_SECRET" \
  https://your-domain.com/api/cron/deployments
```

## Database

The worker updates these fields:
- `last_run_at` - Timestamp of last execution
- `next_run_at` - Calculated next run time
- `updated_at` - Last update timestamp

## Notifications

When a scheduled deployment runs:
1. Deployment starts → `deployment_started` notification
2. Deployment completes → `deployment_success` or `deployment_failed` notification
3. User receives notification in Slack/Telegram

## Limitations

- Minimum frequency: 1 minute (Vercel Cron)
- Maximum schedules: Unlimited
- Execution timeout: 10 seconds (Vercel Hobby), 60 seconds (Pro)

## Future Enhancements

- Retry failed deployments
- Deployment history tracking
- Email notifications
- Slack/Telegram alerts for cron failures
- Dashboard for monitoring schedules
