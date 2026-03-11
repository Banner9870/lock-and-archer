# One-shot cron runner: calls the app's Sun-Times ingest endpoint then exits.
# Use with Railway Cron Schedule (e.g. 0 8 * * * for daily 8 AM UTC).
# Set INGEST_URL (e.g. https://your-app.up.railway.app) and INGEST_CRON_SECRET in Railway variables.
FROM curlimages/curl:latest
ENV INGEST_URL=""
ENV INGEST_CRON_SECRET=""
CMD sh -c 'curl -sS -f -X POST -H "Authorization: Bearer $INGEST_CRON_SECRET" "$INGEST_URL/api/ingest/suntimes-rss" || exit 1'
