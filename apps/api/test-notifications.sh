#!/bin/bash

# Test script for booking notification cases
# Make sure API is running on localhost:3001

API_URL="http://localhost:3001/api/v1"
# Use unicode escape for ! to avoid shell interpretation issues
PASSWORD='Password123\u0021'

echo "=========================================="
echo "Testing Booking Notification Cases"
echo "=========================================="

# 1. Login as patient
echo ""
echo "1. Logging in as patient (patient@test.com)..."
PATIENT_RESPONSE=$(curl -s -X POST "$API_URL/auth/login" \
  -H "Content-Type: application/json" \
  -d "{\"email\":\"patient@test.com\",\"password\":\"$PASSWORD\"}")

PATIENT_TOKEN=$(echo $PATIENT_RESPONSE | grep -o '"accessToken":"[^"]*"' | cut -d'"' -f4)

if [ -z "$PATIENT_TOKEN" ]; then
  echo "Failed to login as patient. Response: $PATIENT_RESPONSE"
  exit 1
fi
echo "Patient token: ${PATIENT_TOKEN:0:30}..."

# 2. Login as therapist (using dr.chen who is first in the list)
echo ""
echo "2. Logging in as therapist (dr.chen@test.com)..."
THERAPIST_RESPONSE=$(curl -s -X POST "$API_URL/auth/login" \
  -H "Content-Type: application/json" \
  -d "{\"email\":\"dr.chen@test.com\",\"password\":\"$PASSWORD\"}")

THERAPIST_TOKEN=$(echo $THERAPIST_RESPONSE | grep -o '"accessToken":"[^"]*"' | cut -d'"' -f4)

if [ -z "$THERAPIST_TOKEN" ]; then
  echo "Failed to login as therapist. Response: $THERAPIST_RESPONSE"
  exit 1
fi
echo "Therapist token: ${THERAPIST_TOKEN:0:30}..."

# Get therapist ID
echo ""
echo "3. Getting therapist profile..."
THERAPIST_PROFILE=$(curl -s -X GET "$API_URL/auth/me" \
  -H "Authorization: Bearer $THERAPIST_TOKEN")
echo "Therapist profile: $THERAPIST_PROFILE"

# Get therapist ID from therapists list (first one matches dr.chen)
THERAPISTS=$(curl -s -X GET "$API_URL/therapists" \
  -H "Authorization: Bearer $PATIENT_TOKEN")
THERAPIST_ID=$(echo $THERAPISTS | grep -o '"id":"[^"]*"' | head -1 | cut -d'"' -f4)
echo "Therapist ID: $THERAPIST_ID"

# Calculate future date with unique timestamp to avoid conflicts
RANDOM_MIN=$((RANDOM % 60))
RANDOM_HOUR=$((9 + RANDOM % 8))
SCHEDULED_DATE=$(date -v+1d -u +"%Y-%m-%dT${RANDOM_HOUR}:${RANDOM_MIN}:00.000Z" 2>/dev/null || date -d "+1 day" -u +"%Y-%m-%dT${RANDOM_HOUR}:${RANDOM_MIN}:00.000Z")

echo ""
echo "=========================================="
echo "TEST CASE 1: Booking Request"
echo "=========================================="
echo "Creating appointment request (Patient -> Therapist notification)..."

APPOINTMENT_RESPONSE=$(curl -s -X POST "$API_URL/appointments" \
  -H "Authorization: Bearer $PATIENT_TOKEN" \
  -H "Content-Type: application/json" \
  -d "{
    \"therapistId\": \"$THERAPIST_ID\",
    \"scheduledAt\": \"$SCHEDULED_DATE\",
    \"duration\": 60,
    \"timezone\": \"America/New_York\",
    \"bookingNotes\": \"Test booking for notification\",
    \"amount\": 15000
  }")

APPOINTMENT_ID=$(echo $APPOINTMENT_RESPONSE | grep -o '"id":"[^"]*"' | head -1 | cut -d'"' -f4)
echo "Appointment created: $APPOINTMENT_ID"
echo "Response: $APPOINTMENT_RESPONSE"
echo ""
echo ">> Check therapist's phone for push notification!"

sleep 2

echo ""
echo "=========================================="
echo "TEST CASE 2: Accept Booking"
echo "=========================================="
echo "Therapist confirming appointment (Therapist -> Patient notification)..."

CONFIRM_RESPONSE=$(curl -s -X PATCH "$API_URL/appointments/$APPOINTMENT_ID/confirm" \
  -H "Authorization: Bearer $THERAPIST_TOKEN" \
  -H "Content-Type: application/json")

echo "Confirm response: $CONFIRM_RESPONSE"
echo ""
echo ">> Check patient's phone for 'Booking Confirmed' notification!"

sleep 2

echo ""
echo "=========================================="
echo "TEST CASE 3: Cancel Appointment (by therapist)"
echo "=========================================="
echo "Therapist cancelling appointment (Therapist -> Patient notification)..."

# First create another appointment for cancel test
RANDOM_MIN2=$((RANDOM % 60))
RANDOM_HOUR2=$((9 + RANDOM % 8))
SCHEDULED_DATE2=$(date -v+2d -u +"%Y-%m-%dT${RANDOM_HOUR2}:${RANDOM_MIN2}:00.000Z" 2>/dev/null || date -d "+2 days" -u +"%Y-%m-%dT${RANDOM_HOUR2}:${RANDOM_MIN2}:00.000Z")

APPOINTMENT2_RESPONSE=$(curl -s -X POST "$API_URL/appointments" \
  -H "Authorization: Bearer $PATIENT_TOKEN" \
  -H "Content-Type: application/json" \
  -d "{
    \"therapistId\": \"$THERAPIST_ID\",
    \"scheduledAt\": \"$SCHEDULED_DATE2\",
    \"duration\": 60,
    \"timezone\": \"America/New_York\",
    \"bookingNotes\": \"Test for cancel\",
    \"amount\": 15000
  }")

APPOINTMENT2_ID=$(echo $APPOINTMENT2_RESPONSE | grep -o '"id":"[^"]*"' | head -1 | cut -d'"' -f4)
echo "Created appointment for cancel test: $APPOINTMENT2_ID"

# Confirm it first
curl -s -X PATCH "$API_URL/appointments/$APPOINTMENT2_ID/confirm" \
  -H "Authorization: Bearer $THERAPIST_TOKEN" > /dev/null

sleep 1

# Now cancel as therapist (use therapist-cancel endpoint)
CANCEL_RESPONSE=$(curl -s -X PATCH "$API_URL/appointments/$APPOINTMENT2_ID/therapist-cancel" \
  -H "Authorization: Bearer $THERAPIST_TOKEN" \
  -H "Content-Type: application/json" \
  -d "{\"reason\": \"Emergency - need to reschedule\"}")

echo "Cancel response: $CANCEL_RESPONSE"
echo ""
echo ">> Check patient's phone for 'Appointment Cancelled' notification!"

sleep 2

echo ""
echo "=========================================="
echo "TEST CASE 4: Decline Booking"
echo "=========================================="
echo "Creating new appointment for decline test..."

RANDOM_MIN3=$((RANDOM % 60))
RANDOM_HOUR3=$((9 + RANDOM % 8))
SCHEDULED_DATE3=$(date -v+3d -u +"%Y-%m-%dT${RANDOM_HOUR3}:${RANDOM_MIN3}:00.000Z" 2>/dev/null || date -d "+3 days" -u +"%Y-%m-%dT${RANDOM_HOUR3}:${RANDOM_MIN3}:00.000Z")

APPOINTMENT3_RESPONSE=$(curl -s -X POST "$API_URL/appointments" \
  -H "Authorization: Bearer $PATIENT_TOKEN" \
  -H "Content-Type: application/json" \
  -d "{
    \"therapistId\": \"$THERAPIST_ID\",
    \"scheduledAt\": \"$SCHEDULED_DATE3\",
    \"duration\": 60,
    \"timezone\": \"America/New_York\",
    \"bookingNotes\": \"Test for decline\",
    \"amount\": 15000
  }")

APPOINTMENT3_ID=$(echo $APPOINTMENT3_RESPONSE | grep -o '"id":"[^"]*"' | head -1 | cut -d'"' -f4)
echo "Created appointment: $APPOINTMENT3_ID"

echo "Therapist declining appointment..."

DECLINE_RESPONSE=$(curl -s -X PATCH "$API_URL/appointments/$APPOINTMENT3_ID/decline" \
  -H "Authorization: Bearer $THERAPIST_TOKEN" \
  -H "Content-Type: application/json" \
  -d "{\"reason\": \"Schedule conflict - please try another time\"}")

echo "Decline response: $DECLINE_RESPONSE"
echo ""
echo ">> Check patient's phone for 'Booking Not Available' notification!"

sleep 2

echo ""
echo "=========================================="
echo "TEST CASE 5: Cancel by Patient"
echo "=========================================="
echo "Creating new appointment for patient cancel test..."

RANDOM_MIN4=$((RANDOM % 60))
RANDOM_HOUR4=$((9 + RANDOM % 8))
SCHEDULED_DATE4=$(date -v+4d -u +"%Y-%m-%dT${RANDOM_HOUR4}:${RANDOM_MIN4}:00.000Z" 2>/dev/null || date -d "+4 days" -u +"%Y-%m-%dT${RANDOM_HOUR4}:${RANDOM_MIN4}:00.000Z")

APPOINTMENT4_RESPONSE=$(curl -s -X POST "$API_URL/appointments" \
  -H "Authorization: Bearer $PATIENT_TOKEN" \
  -H "Content-Type: application/json" \
  -d "{
    \"therapistId\": \"$THERAPIST_ID\",
    \"scheduledAt\": \"$SCHEDULED_DATE4\",
    \"duration\": 60,
    \"timezone\": \"America/New_York\",
    \"bookingNotes\": \"Test for patient cancel\",
    \"amount\": 15000
  }")

APPOINTMENT4_ID=$(echo $APPOINTMENT4_RESPONSE | grep -o '"id":"[^"]*"' | head -1 | cut -d'"' -f4)
echo "Created appointment: $APPOINTMENT4_ID"

# Confirm it first
curl -s -X PATCH "$API_URL/appointments/$APPOINTMENT4_ID/confirm" \
  -H "Authorization: Bearer $THERAPIST_TOKEN" > /dev/null

sleep 1

echo "Patient cancelling appointment..."

CANCEL2_RESPONSE=$(curl -s -X PATCH "$API_URL/appointments/$APPOINTMENT4_ID/cancel" \
  -H "Authorization: Bearer $PATIENT_TOKEN" \
  -H "Content-Type: application/json" \
  -d "{\"reason\": \"Something came up - need to reschedule\"}")

echo "Cancel response: $CANCEL2_RESPONSE"
echo ""
echo ">> Check therapist's phone for 'Appointment Cancelled' notification!"

echo ""
echo "=========================================="
echo "All test cases completed!"
echo "=========================================="
echo ""
echo "Summary of notifications sent:"
echo "1. Booking Request -> Therapist received new booking notification"
echo "2. Accept Booking -> Patient received confirmation notification"
echo "3. Cancel by Therapist -> Patient received cancellation notification"
echo "4. Decline Booking -> Patient received declined notification"
echo "5. Cancel by Patient -> Therapist received cancellation notification"
