#!/bin/bash

# Automated Firebase Seeding Script
# This script:
# 1. Deploys open rules (allows all operations)
# 2. Seeds the database with admin user only
# 3. Restores production security rules

set -e  # Exit on any error

USER_UID="qWOgbSp5LYSXT4cZJ5yxVJ3huZq2"
PROJECT_ID="openedu-1f258"

echo "🚀 Starting Automated Firebase Seeding Process"
echo "=============================================="

# Step 1: Deploy open rules and indexes for seeding
echo ""
echo "🔓 Step 1: Deploying open rules and indexes for seeding..."
cp firestore.open.rules firestore.rules
firebase deploy --only firestore
echo "✅ Open rules and indexes deployed successfully"

# Step 2: Wait a moment for rules to propagate
echo "⏳ Waiting 5 seconds for rules to propagate..."
sleep 5

# Step 3: Run the seeding script
echo ""
echo "🌱 Step 2: Seeding database with admin user..."

# Get the current user UID from Firebase
echo "🔍 Getting admin user UID from Firebase Auth..."
firebase auth:export temp-users.json --project $PROJECT_ID
if [ -f temp-users.json ]; then
  USER_UID=$(jq -r '.users[0].localId' temp-users.json)
  EMAIL=$(jq -r '.users[0].email' temp-users.json)
  rm temp-users.json
  
  if [ -z "$USER_UID" ] || [ "$USER_UID" = "null" ]; then
    echo "❌ No users found in Firebase Authentication"
    echo "Please ensure you have at least one user in your Firebase project"
    exit 1
  fi
  
  echo "✅ Found user: $EMAIL (UID: $USER_UID)"
  
  # Export UID and email for the Node.js script to use
  export FIREBASE_ADMIN_UID="$USER_UID"
  export FIREBASE_ADMIN_EMAIL="$EMAIL"
  
  # Run the seeding script
  node scripts/automated-seed.mjs
else
  echo "❌ Failed to export users from Firebase Auth"
  exit 1
fi

echo "✅ Database seeding completed"

# Step 4: Restore production rules and ensure indexes are deployed
echo ""
echo "🔒 Step 3: Restoring production security rules and indexes..."
cp firestore.production.rules firestore.rules
firebase deploy --only firestore
echo "✅ Production rules and indexes deployed successfully"

echo ""
echo "🎉 Automated seeding process completed!"
echo ""
echo "Summary:"
echo "✅ Database seeded with admin user (UID: $USER_UID)"
echo "✅ Production security rules active"
echo "✅ Firestore indexes deployed (31 composite indexes)"
echo ""
echo "Note: Using Firestore database from .env.local (FIREBASE_DATABASE_NAME)"
echo "      If not set, defaults to '(default)' database"
echo ""
echo "Next steps:"
echo "1. Visit http://localhost:5173"
echo "2. Login with your Google account ($EMAIL)"
echo "3. You should now have admin access!"
echo "4. Go to /admin/courses/new to create your first course"
echo "5. Check /admin dashboard to manage courses"
echo ""
echo "🔗 Firebase Console: https://console.firebase.google.com/project/$PROJECT_ID/firestore/data"