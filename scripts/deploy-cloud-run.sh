#!/usr/bin/env bash
# Deploys KisanSetu to Google Cloud Run with Vertex AI (Gemini) and Firestore.
#
#   PROJECT_ID=my-project REGION=asia-south1 ./scripts/deploy-cloud-run.sh
#
# Prerequisites: gcloud CLI logged in, billing enabled on the project.
set -euo pipefail

PROJECT_ID="${PROJECT_ID:?Set PROJECT_ID}"
REGION="${REGION:-asia-south1}"          # Mumbai: lowest latency for Indian users
SERVICE="${SERVICE:-kisansetu}"
SA_NAME="${SERVICE}-run"
SA_EMAIL="${SA_NAME}@${PROJECT_ID}.iam.gserviceaccount.com"

gcloud config set project "$PROJECT_ID" >/dev/null

echo "› Enabling APIs"
gcloud services enable run.googleapis.com cloudbuild.googleapis.com artifactregistry.googleapis.com \
  aiplatform.googleapis.com firestore.googleapis.com

echo "› Firestore (Native mode) database"
gcloud firestore databases describe --database="(default)" >/dev/null 2>&1 ||
  gcloud firestore databases create --location="$REGION" --type=firestore-native

echo "› Least-privilege service account"
gcloud iam service-accounts describe "$SA_EMAIL" >/dev/null 2>&1 ||
  gcloud iam service-accounts create "$SA_NAME" --display-name="KisanSetu Cloud Run"
for role in roles/aiplatform.user roles/datastore.user roles/logging.logWriter; do
  gcloud projects add-iam-policy-binding "$PROJECT_ID" --member="serviceAccount:$SA_EMAIL" --role="$role" --condition=None >/dev/null
done

echo "› Building and deploying"
gcloud run deploy "$SERVICE" \
  --source . \
  --region "$REGION" \
  --service-account "$SA_EMAIL" \
  --allow-unauthenticated \
  --port 8080 \
  --cpu 1 --memory 1Gi \
  --min-instances 1 --max-instances 10 \
  --concurrency 40 --timeout 120 \
  --set-env-vars "GOOGLE_GENAI_USE_VERTEXAI=true,GOOGLE_CLOUD_PROJECT=$PROJECT_ID,GOOGLE_CLOUD_LOCATION=global,DATA_BACKEND=firestore,LOG_LEVEL=info"

URL="$(gcloud run services describe "$SERVICE" --region "$REGION" --format='value(status.url)')"
echo "› Deployed: $URL"
curl -fsS "$URL/api/health" && echo
